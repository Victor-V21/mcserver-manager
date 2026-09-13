import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';
import { PlayitStatus, PlayitTunnel } from '../types';

export class PlayitService {
  private static instance: PlayitService;
  private configService: ConfigService;
  private playitProcess: ChildProcess | null = null;
  private recentLogs: string[] = [];
  private maxLogs: number = 200;
  private publicAddress: string = '';
  private tunnels: PlayitTunnel[] = [];

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): PlayitService {
    if (!PlayitService.instance) {
      PlayitService.instance = new PlayitService();
    }
    return PlayitService.instance;
  }

  public getStatus(): PlayitStatus {
    const isRunning = this.playitProcess !== null && !this.playitProcess.killed;
    return {
      isRunning,
      pid: this.playitProcess ? this.playitProcess.pid || null : null,
      tunnels: this.tunnels,
      publicAddress: this.publicAddress || undefined,
      logs: this.recentLogs.slice(-50),
    };
  }

  private findPlayitBinary(): string | null {
    // 1. Check local playit/playit inside server root
    const localBinary = path.join(this.configService.getRootPath(), SUBDIRS.PLAYIT, 'playit');
    if (fs.existsSync(localBinary)) {
      try {
        fs.chmodSync(localBinary, 0o755);
        return localBinary;
      } catch {}
    }

    // 2. Check system PATH
    const standardPaths = ['/usr/local/bin/playit', '/usr/bin/playit', 'playit'];
    for (const p of standardPaths) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.playitProcess && !this.playitProcess.killed) {
      return { success: false, message: 'Playit is already running' };
    }

    const binary = this.findPlayitBinary();
    if (!binary) {
      throw new Error(
        'Playit binary not found. Place the "playit" binary in the playit/ folder or install it on the host.'
      );
    }

    const playitDir = path.join(this.configService.getRootPath(), SUBDIRS.PLAYIT);
    if (!fs.existsSync(playitDir)) fs.mkdirSync(playitDir, { recursive: true });

    try {
      const child = spawn(binary, ['--secret_path', path.join(playitDir, 'playit.toml')], {
        cwd: playitDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.playitProcess = child;

      child.stdout.on('data', (chunk) => {
        this.handleOutput(chunk.toString());
      });

      child.stderr.on('data', (chunk) => {
        this.handleOutput(chunk.toString());
      });

      child.on('close', (code) => {
        this.appendLog(`Playit process exited with code ${code}`);
        this.playitProcess = null;
      });

      child.on('error', (err) => {
        this.appendLog(`Playit error: ${err.message}`);
        this.playitProcess = null;
      });

      return { success: true, message: 'Playit tunnel started' };
    } catch (err: any) {
      throw new Error(`Failed to start Playit: ${err.message}`);
    }
  }

  public stop(): { success: boolean; message: string } {
    if (!this.playitProcess || this.playitProcess.killed) {
      return { success: false, message: 'Playit is not running' };
    }

    this.playitProcess.kill('SIGTERM');
    this.playitProcess = null;
    this.appendLog('Playit tunnel stopped');
    return { success: true, message: 'Playit tunnel stopped' };
  }

  public async restart(): Promise<{ success: boolean; message: string }> {
    this.stop();
    await new Promise((r) => setTimeout(r, 1500));
    return this.start();
  }

  private handleOutput(text: string): void {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      this.appendLog(line);

      // Parse tunnel domains like: "tunnel ready: abc.gl.at.ply.gg:12345" or "playit.gg"
      const domainMatch = line.match(/([a-zA-Z0-9.-]+\.(?:ply\.gg|playit\.gg)(?::\d+)?)/i);
      if (domainMatch && domainMatch[1]) {
        this.publicAddress = domainMatch[1];
        if (!this.tunnels.find((t) => t.publicAddress === this.publicAddress)) {
          this.tunnels.push({
            id: 'minecraft',
            tunnelType: 'minecraft-java',
            publicAddress: this.publicAddress,
            port: 25565,
          });
        }
      }
    }
  }

  private appendLog(line: string): void {
    const timestamp = new Date().toISOString().slice(11, 19);
    this.recentLogs.push(`[${timestamp}] ${line}`);
    if (this.recentLogs.length > this.maxLogs) {
      this.recentLogs.shift();
    }
  }
}
