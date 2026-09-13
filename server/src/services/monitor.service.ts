import si from 'systeminformation';
import pidusage from 'pidusage';
import { ConfigService } from './config.service';
import { ProcessService } from './process.service';
import { RconService } from './rcon.service';
import { PropertiesService } from './properties.service';
import { PlayerInfo } from '../types';

export class MonitorService {
  private static instance: MonitorService;
  private configService: ConfigService;
  private processService: ProcessService;
  private rconService: RconService;
  private propertiesService: PropertiesService;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.processService = ProcessService.getInstance();
    this.rconService = RconService.getInstance();
    this.propertiesService = PropertiesService.getInstance();
  }

  public static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }

  public async getStatus(): Promise<any> {
    const procStatus = this.processService.getStatus();
    const rootPath = this.configService.getRootPath();

    // Default safe metrics
    let hostCpu = 0;
    let procCpu = 0;
    let memUsed = 0;
    let memTotal = 8192;
    let memPercent = 0;
    let diskUsed = 0;
    let diskTotal = 50;
    let diskPercent = 0;
    let maxPlayers = 20;

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

    if (procStatus.isRunning && procStatus.pid) {
      try {
        const stats = await pidusage(procStatus.pid);
        if (stats) {
          procCpu = Math.round((stats.cpu || 0) * 10) / 10;
        }
      } catch {}
    }

    try {
      const fsSize = await si.fsSize();
      if (Array.isArray(fsSize) && fsSize.length > 0) {
        const mount = fsSize.find((f) => rootPath.startsWith(f.mount)) || fsSize[0];
        if (mount) {
          diskTotal = Math.round((mount.size || 0) / (1024 * 1024 * 1024)); // GB
          diskUsed = Math.round((mount.used || 0) / (1024 * 1024 * 1024)); // GB
          diskPercent = Math.round(mount.use || 0);
        }
      }
    } catch {}

    try {
      const { properties } = this.propertiesService.getProperties();
      if (properties && properties['max-players']) {
        maxPlayers = parseInt(properties['max-players'], 10) || 20;
      }
    } catch {}

    let onlineCount = 0;
    let playerList: PlayerInfo[] = [];
    let tps = procStatus.isRunning ? 20.0 : 0;

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

          try {
            const tpsRes = await this.rconService.sendCommand('neoforge tps');
            const tpsMatch = tpsRes.match(/Mean TPS:\s*([\d.]+)/);
            if (tpsMatch && tpsMatch[1]) {
              tps = Math.round(parseFloat(tpsMatch[1]) * 10) / 10;
            }
          } catch {}
        }
      } catch {}
    }

    return {
      isRunning: procStatus.isRunning,
      state: procStatus.status,
      status: procStatus.status,
      pid: procStatus.pid,
      uptime: procStatus.uptime,
      version: '1.21.1 (NeoForge)',
      cpu: {
        host: hostCpu,
        java: procStatus.isRunning ? procCpu : 0,
      },
      hostCpu,
      ram: {
        used: memUsed,
        total: memTotal,
        percent: memPercent,
        maxAllocated: 8192,
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        free: Math.max(0, diskTotal - diskUsed),
        percent: diskPercent,
      },
      tps: {
        current: tps,
        history: [tps, tps, tps, tps, tps],
      },
      players: {
        online: onlineCount,
        max: maxPlayers,
        list: playerList,
      },
    };
  }
}
