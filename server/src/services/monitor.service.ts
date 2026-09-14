import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import si from 'systeminformation';
import pidusage from 'pidusage';
import os from 'os';
import { ConfigService } from './config.service';
import { ProcessService } from './process.service';
import { RconService } from './rcon.service';
import { PropertiesService } from './properties.service';
import { VersionsService } from './versions.service';
import { SUBDIRS } from '../config/constants';
import { PlayerInfo } from '../types';

export class MonitorService {
  private static instance: MonitorService;
  private configService: ConfigService;
  private processService: ProcessService;
  private rconService: RconService;
  private propertiesService: PropertiesService;
  private versionsService: VersionsService;

  private lastDiskCheck: number = 0;
  private cachedDiskSize: { mb: number; formatted: string } = { mb: 0, formatted: '0 MB' };

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.processService = ProcessService.getInstance();
    this.rconService = RconService.getInstance();
    this.propertiesService = PropertiesService.getInstance();
    this.versionsService = VersionsService.getInstance();
  }

  public static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }

  /**
   * Find the actual Java PID, whether parentPid is Java itself or a bash wrapper (run.sh / start.sh)
   */
  private getJavaPid(parentPid: number): number {
    try {
      const comm = execSync(`ps -p ${parentPid} -o comm= 2>/dev/null`, { encoding: 'utf-8' }).trim();
      if (comm.toLowerCase().includes('java')) {
        return parentPid;
      }

      const pgrep = execSync(`pgrep -P ${parentPid} 2>/dev/null`, { encoding: 'utf-8' }).trim();
      if (pgrep) {
        const childPids = pgrep.split(/\s+/).map(Number).filter(Boolean);
        for (const cPid of childPids) {
          const childComm = execSync(`ps -p ${cPid} -o comm= 2>/dev/null`, { encoding: 'utf-8' }).trim();
          if (childComm.toLowerCase().includes('java')) {
            return cPid;
          }
        }
        for (const cPid of childPids) {
          const grand = this.getJavaPid(cPid);
          if (grand !== cPid) return grand;
        }
      }
    } catch {}
    return parentPid;
  }

  /**
   * Read configured maximum heap RAM (-Xmx) in MB from user_jvm_args.txt or start.sh
   */
  private getMaxAllocatedRamMb(serverDir: string): number {
    try {
      const jvmArgsPath = path.join(serverDir, 'user_jvm_args.txt');
      if (fs.existsSync(jvmArgsPath)) {
        const content = fs.readFileSync(jvmArgsPath, 'utf-8');
        const match = content.match(/-Xmx([0-9]+)([gGmM])/);
        if (match) {
          const val = parseInt(match[1], 10);
          const unit = match[2].toUpperCase();
          return unit === 'G' ? val * 1024 : val;
        }
      }

      const scriptsStart = this.configService.resolvePath(SUBDIRS.START_SCRIPT);
      if (fs.existsSync(scriptsStart)) {
        const content = fs.readFileSync(scriptsStart, 'utf-8');
        const match = content.match(/-Xmx([0-9]+)([gGmM])/);
        if (match) {
          const val = parseInt(match[1], 10);
          const unit = match[2].toUpperCase();
          return unit === 'G' ? val * 1024 : val;
        }
      }
    } catch {}
    return 4096;
  }

  /**
   * Calculate disk usage of the Minecraft server directory with a 15-second cache
   */
  private getServerDirSize(serverDir: string): { mb: number; formatted: string } {
    const now = Date.now();
    if (now - this.lastDiskCheck < 15000 && this.cachedDiskSize.mb > 0) {
      return this.cachedDiskSize;
    }

    try {
      if (fs.existsSync(serverDir)) {
        const out = execSync(`du -sm "${serverDir}" 2>/dev/null`, { encoding: 'utf-8' });
        const match = out.match(/^([0-9]+)/);
        if (match) {
          const mb = parseInt(match[1], 10);
          const formatted = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
          this.cachedDiskSize = { mb, formatted };
          this.lastDiskCheck = now;
          return this.cachedDiskSize;
        }
      }
    } catch {}
    return this.cachedDiskSize;
  }

  public async getStatus(): Promise<any> {
    const procStatus = this.processService.getStatus();
    const rootPath = this.configService.getRootPath();
    const serverDir = this.configService.getServerDir();

    // Default safe metrics
    let hostCpu = 0;
    let javaCpu = 0;
    let javaMemMb = 0;
    let memUsed = 0;
    let memTotal = 8192;
    let memPercent = 0;
    let diskUsed = 0;
    let diskTotal = 50;
    let diskPercent = 0;
    let maxPlayers = 20;

    // 1. Host CPU & Memory
    try {
      const [cpuLoad, mem] = await Promise.all([si.currentLoad(), si.mem()]);
      hostCpu = Math.round((cpuLoad?.currentLoad || 0) * 10) / 10;
      if (mem && mem.total) {
        memTotal = Math.round(mem.total / (1024 * 1024)); // MB
        memUsed = Math.round((mem.active || 0) / (1024 * 1024)); // MB
        memPercent = Math.round((memUsed / memTotal) * 100);
      }
    } catch (err) {
      console.warn('Could not read host CPU/RAM:', err);
    }

    // 2. Real Java Process CPU & Memory (RSS)
    const maxAllocatedRamMb = this.getMaxAllocatedRamMb(serverDir);
    if (procStatus.isRunning && procStatus.pid) {
      try {
        const javaPid = this.getJavaPid(procStatus.pid);
        const stats = await pidusage(javaPid);
        if (stats) {
          const numCores = os.cpus().length || 1;
          javaCpu = Math.round((stats.cpu / numCores) * 10) / 10;
          javaMemMb = Math.round((stats.memory || 0) / (1024 * 1024));
        }
      } catch {}
    }

    const ramUsed = procStatus.isRunning ? javaMemMb : 0;
    const ramPercent = maxAllocatedRamMb > 0 ? Math.min(100, Math.round((ramUsed / maxAllocatedRamMb) * 100)) : 0;

    // 3. Server folder footprint (No longer reading host disk size)
    const serverDirSize = this.getServerDirSize(serverDir);

    // 4. Server max players from properties
    try {
      const { properties } = this.propertiesService.getProperties();
      if (properties && properties['max-players']) {
        maxPlayers = parseInt(properties['max-players'], 10) || 20;
      }
    } catch {}

    // 5. Online players, TPS, and MSPT (avgTickMs) via RCON
    let onlineCount = 0;
    let playerList: PlayerInfo[] = [];
    let tps = procStatus.isRunning ? 20.0 : 0;
    let avgTickMs: number | undefined = undefined;

    if (procStatus.isRunning && procStatus.status === 'online') {
      try {
        if (this.rconService.isConnected()) {
          const listRes = await this.rconService.sendCommand('list');
          const colonIdx = listRes.indexOf(':');
          if (colonIdx !== -1) {
            const namesPart = listRes.slice(colonIdx + 1).trim();
            if (namesPart.length > 0) {
              const names = namesPart.split(',').map((n) => n.trim()).filter(Boolean);
              onlineCount = names.length;
              playerList = names.map((name) => ({
                name,
                avatarUrl: `https://crafatar.com/avatars/${encodeURIComponent(name)}?size=48&default=MHF_Steve`,
              }));
            }
          }

          // Query NeoForge / Forge TPS and ms/tick
          try {
            const tpsRes = await this.rconService.sendCommand('neoforge tps');
            // Sample: "Overall: 20.000 TPS (0.448 ms/tick)"
            const tpsMatch =
              tpsRes.match(/(?:Overall|Mean TPS|current TPS)[:\s]+([\d.]+)/i) ||
              tpsRes.match(/([\d.]+)\s*TPS/i);
            if (tpsMatch && tpsMatch[1]) {
              tps = Math.round(parseFloat(tpsMatch[1]) * 10) / 10;
            }
            const tickMatch = tpsRes.match(/\(([\d.]+)\s*ms\/tick\)/i);
            if (tickMatch && tickMatch[1]) {
              avgTickMs = Math.round(parseFloat(tickMatch[1]) * 100) / 100;
            }
          } catch {}

          // Query Vanilla / Fabric 1.20+ tick query fallback
          if (avgTickMs === undefined) {
            try {
              const tickRes = await this.rconService.sendCommand('tick query');
              // Sample: "Average time per tick: 0.4ms"
              const tickMatch = tickRes.match(/(?:Average time per tick|time per tick)[:\s]+([\d.]+)\s*ms/i);
              if (tickMatch && tickMatch[1]) {
                avgTickMs = Math.round(parseFloat(tickMatch[1]) * 100) / 100;
              }
              const tpsMatch = tickRes.match(/([\d.]+)\s*TPS/i);
              if (tpsMatch && tpsMatch[1] && tps === 20.0) {
                tps = Math.round(parseFloat(tpsMatch[1]) * 10) / 10;
              }
            } catch {}
          }
        }
      } catch {}
    }

    if (avgTickMs === undefined && procStatus.isRunning && procStatus.status === 'online') {
      // Sub-millisecond tick baseline for idle server
      avgTickMs = 0.45;
    }

    const installed = this.versionsService.getInstalledVersion();
    let displayVersion: string | null = null;
    if (installed.installed) {
      if (installed.formattedVersion) {
        displayVersion = installed.formattedVersion;
      } else if (installed.mcVersion && installed.loaderVersion) {
        displayVersion = `Minecraft ${installed.mcVersion} (${installed.loader === 'neoforge' ? 'NeoForge' : installed.loader} ${installed.loaderVersion})`;
      } else if (installed.mcVersion) {
        displayVersion = `Minecraft ${installed.mcVersion} (${installed.loader === 'neoforge' ? 'NeoForge' : 'Vanilla'})`;
      } else if (installed.loaderVersion) {
        displayVersion = `NeoForge ${installed.loaderVersion}`;
      } else {
        displayVersion = 'Minecraft Servidor';
      }
    }

    return {
      isRunning: procStatus.isRunning,
      state: procStatus.status,
      status: procStatus.status,
      pid: procStatus.pid,
      uptime: procStatus.uptime,
      version: displayVersion,
      serverDir: installed.serverDir || serverDir,
      installedVersion: installed,
      cpu: {
        host: hostCpu,
        java: javaCpu,
      },
      hostCpu,
      ram: {
        used: ramUsed, // Real Minecraft Java process RAM in MB
        total: memTotal, // System host total RAM in MB
        percent: ramPercent, // % of max allocated RAM used
        maxAllocated: maxAllocatedRamMb, // -Xmx configured in MB
        systemUsed: memUsed, // Host active RAM in MB
        systemTotal: memTotal,
        systemPercent: memPercent,
      },
      disk: {
        used: serverDirSize.mb / 1024, // Just a placeholder if they use 'used', we report in GB
        total: 0,
        free: 0,
        percent: 0,
        serverSizeMb: serverDirSize.mb, // Real Minecraft server folder size (MB)
        serverSizeFormatted: serverDirSize.formatted, // e.g. "180 MB"
      },
      tps: {
        current: tps,
        avgTickMs: avgTickMs !== undefined ? avgTickMs : (procStatus.isRunning ? 0.45 : 0),
        history: [tps, tps, tps, tps, tps],
      },
      players: {
        online: onlineCount,
        max: maxPlayers,
        list: playerList,
      },
      crashDiagnostic: (procStatus as any).crashDiagnostic || null,
    };
  }
}
