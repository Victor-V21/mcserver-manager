import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';
import { PlayitStatus, PlayitTunnel } from '../types';

interface PlayitManagerConfig {
  localPort: number;
}

/** Runs the Playit agent next to Minecraft and keeps its state in /data. */
export class PlayitService {
  private static instance: PlayitService;
  private configService: ConfigService;
  private playitProcess: ChildProcess | null = null;
  private recentLogs: string[] = [];
  private readonly maxLogs = 200;
  private publicAddress = '';
  private tunnels: PlayitTunnel[] = [];
  private lastError: string | null = null;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): PlayitService {
    if (!PlayitService.instance) PlayitService.instance = new PlayitService();
    return PlayitService.instance;
  }

  private getPlayitDir(): string {
    return path.join(this.configService.getRootPath(), SUBDIRS.PLAYIT);
  }

  private getSecretPath(): string {
    return path.join(this.getPlayitDir(), 'playit.toml');
  }

  private getManagerConfigPath(): string {
    return path.join(this.getPlayitDir(), 'manager.json');
  }

  private getLocalPort(): number {
    try {
      const configPath = this.getManagerConfigPath();
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<PlayitManagerConfig>;
        if (Number.isInteger(config.localPort) && Number(config.localPort) >= 1 && Number(config.localPort) <= 65535) {
          return Number(config.localPort);
        }
      }
    } catch {}
    const fromEnv = Number(process.env.PLAYIT_LOCAL_PORT || 25565);
    return Number.isInteger(fromEnv) && fromEnv >= 1 && fromEnv <= 65535 ? fromEnv : 25565;
  }

  public getConfig(): {
    configured: boolean;
    localPort: number;
    secretPath: string;
    binaryPath: string | null;
  } {
    return {
      configured: fs.existsSync(this.getSecretPath()),
      localPort: this.getLocalPort(),
      secretPath: this.getSecretPath(),
      binaryPath: this.findPlayitBinary(),
    };
  }

  public saveConfig(input: { localPort?: number }): { success: boolean; localPort: number } {
    const localPort = Number(input.localPort);
    if (!Number.isInteger(localPort) || localPort < 1 || localPort > 65535) {
      throw new Error('El puerto local debe ser un número entre 1 y 65535');
    }
    const dir = this.getPlayitDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.getManagerConfigPath(), JSON.stringify({ localPort }, null, 2) + '\n', 'utf8');
    return { success: true, localPort };
  }

  public getStatus(): PlayitStatus {
    const isRunning = this.playitProcess !== null && !this.playitProcess.killed;
    const config = this.getConfig();
    return {
      isRunning,
      pid: this.playitProcess?.pid || null,
      tunnels: this.tunnels,
      publicAddress: this.publicAddress || undefined,
      binaryPath: config.binaryPath,
      secretPath: config.secretPath,
      localPort: config.localPort,
      lastError: this.lastError,
      logs: this.recentLogs.slice(-50),
    };
  }

  private findPlayitBinary(): string | null {
    const localBinary = path.join(this.getPlayitDir(), 'playit');
    if (fs.existsSync(localBinary)) {
      try { fs.chmodSync(localBinary, 0o755); } catch {}
      return localBinary;
    }
    for (const candidate of ['/usr/local/bin/playit', '/usr/bin/playit']) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.playitProcess && !this.playitProcess.killed) {
      return { success: false, message: 'Playit ya está ejecutándose' };
    }

    const binary = this.findPlayitBinary();
    if (!binary) throw new Error('No se encontró el binario de Playit dentro del contenedor');

    const playitDir = this.getPlayitDir();
    fs.mkdirSync(playitDir, { recursive: true });
    this.lastError = null;

    const child = spawn(binary, ['--secret_path', this.getSecretPath()], {
      cwd: playitDir,
      env: { ...process.env, PLAYIT_LOCAL_PORT: String(this.getLocalPort()) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.playitProcess = child;

    child.stdout?.on('data', (chunk) => this.handleOutput(chunk.toString()));
    child.stderr?.on('data', (chunk) => this.handleOutput(chunk.toString()));
    child.on('close', (code) => {
      this.appendLog(`Proceso de Playit finalizado con código ${code}`);
      this.playitProcess = null;
    });
    child.on('error', (error) => {
      this.lastError = error.message;
      this.appendLog(`Error de Playit: ${error.message}`);
      this.playitProcess = null;
    });

    return { success: true, message: 'Agente Playit iniciado' };
  }

  public stop(): { success: boolean; message: string } {
    if (!this.playitProcess || this.playitProcess.killed) {
      return { success: false, message: 'Playit no está ejecutándose' };
    }
    this.playitProcess.kill('SIGTERM');
    this.appendLog('Agente Playit detenido');
    return { success: true, message: 'Agente Playit detenido' };
  }

  public async restart(): Promise<{ success: boolean; message: string }> {
    this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.start();
  }

  public async shutdown(): Promise<void> {
    if (this.playitProcess && !this.playitProcess.killed) this.playitProcess.kill('SIGTERM');
  }

  private handleOutput(text: string): void {
    for (const line of text.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
      this.appendLog(line);
      // Playit normally prints an endpoint such as host.ply.gg:12345.
      const match = line.match(/([a-zA-Z0-9.-]+\.(?:ply\.gg|playit\.gg))(?:\s*:\s*(\d+))?/i);
      if (!match?.[1] || !match[2]) continue;
      const domain = match[1];
      const publicPort = Number(match[2]);
      this.publicAddress = domain;
      const tunnel: PlayitTunnel = {
        id: 'minecraft-java',
        name: 'Minecraft Java',
        proto: 'tcp',
        publicAddress: domain,
        assignedDomain: domain,
        publicPort,
        localPort: this.getLocalPort(),
      };
      this.tunnels = [tunnel];
    }
  }

  private appendLog(line: string): void {
    const timestamp = new Date().toISOString().slice(11, 19);
    this.recentLogs.push(`[${timestamp}] ${line}`);
    if (this.recentLogs.length > this.maxLogs) this.recentLogs.shift();
  }
}
