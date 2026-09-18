import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import si from 'systeminformation';
import pidusage from 'pidusage';
import os from 'os';
import { ConfigService } from './config.service';
import { ProcessService } from './process.service';
import { PropertiesService } from './properties.service';
import { VersionsService } from './versions.service';
import { SUBDIRS } from '../config/constants';
import { PlayerInfo } from '../types';

export class MonitorService {
  private static instance: MonitorService;
  private configService: ConfigService;
  private processService: ProcessService;
  private propertiesService: PropertiesService;
  private versionsService: VersionsService;
  private lastDiskCheck = 0;
  private cachedDiskSize: { mb: number; formatted: string } = { mb: 0, formatted: '0 MB' };

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.processService = ProcessService.getInstance();
    this.propertiesService = PropertiesService.getInstance();
    this.versionsService = VersionsService.getInstance();
  }

  public static getInstance(): MonitorService {
    if (!MonitorService.instance) MonitorService.instance = new MonitorService();
    return MonitorService.instance;
  }

  private getJavaPid(parentPid: number): number {
    try {
      const comm = execFileSync('ps', ['-p', String(parentPid), '-o', 'comm='], { encoding: 'utf-8' }).trim();
      if (comm.toLowerCase().includes('java')) return parentPid;
      const children = execFileSync('pgrep', ['-P', String(parentPid)], { encoding: 'utf-8' })
        .trim().split(/\s+/).map(Number).filter(Boolean);
      for (const childPid of children) {
        const childComm = execFileSync('ps', ['-p', String(childPid), '-o', 'comm='], { encoding: 'utf-8' }).trim();
        if (childComm.toLowerCase().includes('java')) return childPid;
        const nestedPid = this.getJavaPid(childPid);
        if (nestedPid !== childPid) return nestedPid;
      }
    } catch {}
    return parentPid;
  }

  private getMaxAllocatedRamMb(serverDir: string): number {
    const candidates = [path.join(serverDir, 'user_jvm_args.txt'), path.join(serverDir, 'run.sh'), this.configService.resolvePath(SUBDIRS.START_SCRIPT)];
    for (const candidate of candidates) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const content = fs.readFileSync(candidate, 'utf8');
        const match = content.match(/-Xmx([0-9]+)([gGmM])/);
        if (!match) continue;
        const value = Number(match[1]);
        return match[2].toLowerCase() === 'g' ? value * 1024 : value;
      } catch {}
    }
    return 0;
  }

  private getServerDirSize(serverDir: string): { mb: number; formatted: string } {
    const now = Date.now();
    if (now - this.lastDiskCheck < 15000) return this.cachedDiskSize;
    try {
      if (fs.existsSync(serverDir)) {
        const output = execFileSync('du', ['-sm', serverDir], { encoding: 'utf8' });
        const match = output.match(/^(\d+)/);
        if (match) {
          const mb = Number(match[1]);
          this.cachedDiskSize = { mb, formatted: mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB` };
        }
      }
    } catch {}
    this.lastDiskCheck = now;
    return this.cachedDiskSize;
  }

  private getFilesystemUsage(serverDir: string): { used: number; total: number; free: number; percent: number } {
    try {
      const stat = fs.statfsSync(serverDir);
      const blockSize = Number(stat.bsize);
      const total = (Number(stat.blocks) * blockSize) / (1024 ** 3);
      const free = (Number(stat.bavail) * blockSize) / (1024 ** 3);
      const used = Math.max(0, total - free);
      return { used, total, free, percent: total > 0 ? Math.round((used / total) * 100) : 0 };
    } catch {
      return { used: 0, total: 0, free: 0, percent: 0 };
    }
  }

  private getPlayersFromLog(serverDir: string): PlayerInfo[] {
    const active = new Set<string>();
    try {
      const logPath = path.join(serverDir, 'logs', 'latest.log');
      if (!fs.existsSync(logPath)) return [];
      const log = fs.readFileSync(logPath, 'utf8');
      for (const line of log.split(/\r?\n/)) {
        const joined = line.match(/\]:\s*([A-Za-z0-9_]{1,16}) joined the game/i);
        const left = line.match(/\]:\s*([A-Za-z0-9_]{1,16}) left the game/i);
        if (joined) active.add(joined[1]);
        if (left) active.delete(left[1]);
      }
    } catch {}
    return Array.from(active).map((name) => ({
      name,
      avatarUrl: `https://crafatar.com/avatars/${encodeURIComponent(name)}?size=48&default=MHF_Steve`,
    }));
  }

  public async getStatus(): Promise<any> {
    const procStatus = await this.processService.getStatus();
    const serverDir = this.configService.getServerDir();
    let hostCpu = 0;
    let javaCpu = 0;
    let javaMemMb = 0;
    let memUsed = 0;
    let memTotal = 0;
    let memPercent = 0;

    try {
      const [cpuLoad, memory] = await Promise.all([si.currentLoad(), si.mem()]);
      hostCpu = Math.round((cpuLoad?.currentLoad || 0) * 10) / 10;
      if (memory?.total) {
        memTotal = Math.round(memory.total / (1024 * 1024));
        const usedBytes = Number(memory.used || memory.total - (memory.available || 0) || 0);
        memUsed = Math.round(usedBytes / (1024 * 1024));
        memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;
      }
    } catch (error) {
      console.warn('[MonitorService] No se pudo leer CPU/RAM:', error);
    }

    if (procStatus.isRunning && procStatus.pid) {
      try {
        const stats = await pidusage(this.getJavaPid(procStatus.pid));
        const cores = os.cpus().length || 1;
        javaCpu = Math.round((stats.cpu / cores) * 10) / 10;
        javaMemMb = Math.round((stats.memory || 0) / (1024 * 1024));
      } catch {}
    }

    const maxAllocatedRamMb = this.getMaxAllocatedRamMb(serverDir);
    const ramPercent = maxAllocatedRamMb > 0 ? Math.min(100, Math.round((javaMemMb / maxAllocatedRamMb) * 100)) : 0;
    const serverDirSize = this.getServerDirSize(serverDir);
    const filesystem = this.getFilesystemUsage(serverDir);

    let maxPlayers = 0;
    const propertiesPath = this.configService.resolvePath(SUBDIRS.PROPERTIES);
    if (fs.existsSync(propertiesPath)) {
      try {
        const { properties } = this.propertiesService.getProperties();
        const configuredMax = Number(properties['max-players']);
        if (Number.isFinite(configuredMax)) maxPlayers = configuredMax;
      } catch {}
    }

    const playerList = procStatus.isRunning ? this.getPlayersFromLog(serverDir) : [];
    const installed = this.versionsService.getInstalledVersion();
    let displayVersion: string | null = null;
    if (installed.installed) {
      if (installed.formattedVersion) displayVersion = installed.formattedVersion;
      else if (installed.mcVersion && installed.loaderVersion) displayVersion = `Minecraft ${installed.mcVersion} (${installed.loader === 'neoforge' ? 'NeoForge' : installed.loader} ${installed.loaderVersion})`;
      else if (installed.mcVersion) displayVersion = `Minecraft ${installed.mcVersion} (${installed.loader === 'neoforge' ? 'NeoForge' : 'Vanilla'})`;
      else if (installed.loaderVersion) displayVersion = `NeoForge ${installed.loaderVersion}`;
    }

    return {
      isRunning: procStatus.isRunning,
      state: procStatus.status,
      status: procStatus.status,
      pid: procStatus.pid,
      uptime: procStatus.uptime,
      controlError: procStatus.controlError || null,
      version: displayVersion,
      serverDir: installed.serverDir || serverDir,
      installedVersion: installed,
      cpu: { host: hostCpu, java: javaCpu },
      hostCpu,
      ram: {
        used: procStatus.isRunning ? javaMemMb : 0,
        total: memTotal,
        percent: ramPercent,
        maxAllocated: maxAllocatedRamMb,
        systemUsed: memUsed,
        systemTotal: memTotal,
        systemPercent: memPercent,
      },
      disk: {
        used: filesystem.used,
        total: filesystem.total,
        free: filesystem.free,
        percent: filesystem.percent,
        serverSizeMb: serverDirSize.mb,
        serverSizeFormatted: serverDirSize.formatted,
      },
      // TPS requires server-side instrumentation. It is deliberately null
      // instead of a fabricated 20 TPS value when no sampler is installed.
      tps: { current: null, avgTickMs: null, history: [] },
      players: { online: playerList.length, max: maxPlayers, list: playerList },
      crashDiagnostic: procStatus.crashDiagnostic || null,
    };
  }
}
