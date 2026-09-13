import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from './config.service';
import { RconService } from './rcon.service';
import { SUBDIRS } from '../config/constants';

export class ProcessService {
  private static instance: ProcessService;
  private configService: ConfigService;
  private rconService: RconService;
  private serverProcess: ChildProcess | null = null;
  private serverStatus: 'online' | 'offline' | 'starting' | 'stopping' = 'offline';
  private startTime: number | null = null;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.rconService = RconService.getInstance();
  }

  public static getInstance(): ProcessService {
    if (!ProcessService.instance) {
      ProcessService.instance = new ProcessService();
    }
    return ProcessService.instance;
  }

  public getStatus(): {
    isRunning: boolean;
    pid: number | null;
    status: 'online' | 'offline' | 'starting' | 'stopping';
    uptime: number;
  } {
    const isRunning = this.serverProcess !== null && !this.serverProcess.killed;
    const uptime = isRunning && this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    return {
      isRunning,
      pid: this.serverProcess ? this.serverProcess.pid || null : null,
      status: this.serverStatus,
      uptime,
    };
  }

  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.serverProcess && !this.serverProcess.killed) {
      return { success: false, message: 'Server is already running' };
    }

    const root = this.configService.getRootPath();
    const serverDir = path.join(root, SUBDIRS.SERVER);
    const startScript = path.join(root, SUBDIRS.START_SCRIPT);
    const runSh = path.join(serverDir, 'run.sh');
    const serverJar = path.join(serverDir, 'server.jar');

    let command = '';
    let args: string[] = [];
    let cwd = serverDir;

    if (fs.existsSync(startScript)) {
      command = '/bin/bash';
      args = [startScript];
      cwd = path.dirname(startScript);
    } else if (fs.existsSync(runSh)) {
      command = '/bin/bash';
      args = [runSh, 'nogui'];
      cwd = serverDir;
    } else if (fs.existsSync(serverJar)) {
      command = 'java';
      args = ['-Xms4G', '-Xmx8G', '-jar', 'server.jar', 'nogui'];
      cwd = serverDir;
    } else {
      throw new Error('No executable server found. Please install a Minecraft version first.');
    }

    this.serverStatus = 'starting';
    this.startTime = Date.now();

    // Ensure logs directory exists
    const logsDir = path.join(serverDir, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const logFile = path.join(logsDir, 'latest.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    try {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.serverProcess = child;

      child.stdout.on('data', (chunk) => {
        logStream.write(chunk);
        const str = chunk.toString();
        if (str.includes('Done (') || str.includes('! For help, type "help"') || str.includes('Server started')) {
          this.serverStatus = 'online';
        }
      });

      child.stderr.on('data', (chunk) => {
        logStream.write(chunk);
      });

      child.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
        this.serverProcess = null;
        this.serverStatus = 'offline';
        this.startTime = null;
        this.rconService.disconnect();
      });

      child.on('error', (err) => {
        console.error('Failed to start server process:', err);
        this.serverProcess = null;
        this.serverStatus = 'offline';
        this.startTime = null;
      });

      // After 15 seconds, if still starting, mark online as fallback
      setTimeout(() => {
        if (this.serverStatus === 'starting' && this.serverProcess) {
          this.serverStatus = 'online';
        }
      }, 15000);

      return { success: true, message: 'Server started successfully' };
    } catch (err: any) {
      this.serverStatus = 'offline';
      this.startTime = null;
      throw new Error(`Failed to spawn server process: ${err.message}`);
    }
  }

  public async stop(): Promise<{ success: boolean; message: string }> {
    if (!this.serverProcess || this.serverProcess.killed) {
      this.serverStatus = 'offline';
      return { success: false, message: 'Server is not running' };
    }

    this.serverStatus = 'stopping';

    // 1. Try graceful RCON /stop
    try {
      if (this.rconService.isConnected()) {
        await this.rconService.sendCommand('/stop');
      } else {
        // write to stdin if attached
        if (this.serverProcess.stdin && !this.serverProcess.stdin.destroyed) {
          this.serverProcess.stdin.write('stop\n');
        }
      }
    } catch (err) {
      console.warn('Could not send /stop command, proceeding with process signal:', err);
    }

    // 2. Wait up to 25s for graceful shutdown
    const exited = await this.waitForExit(25000);
    if (exited) {
      this.serverStatus = 'offline';
      this.serverProcess = null;
      return { success: true, message: 'Server stopped cleanly' };
    }

    // 3. SIGTERM fallback
    console.warn('Server did not stop cleanly, sending SIGTERM...');
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill('SIGTERM');
    }

    const termExited = await this.waitForExit(5000);
    if (termExited) {
      this.serverStatus = 'offline';
      this.serverProcess = null;
      return { success: true, message: 'Server terminated with SIGTERM' };
    }

    // 4. Force SIGKILL
    return this.kill();
  }

  public async restart(): Promise<{ success: boolean; message: string }> {
    if (this.serverProcess && !this.serverProcess.killed) {
      await this.stop();
    }
    // Wait a brief 2 seconds for ports to release
    await new Promise((r) => setTimeout(r, 2000));
    return this.start();
  }

  public kill(): { success: boolean; message: string } {
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill('SIGKILL');
      this.serverProcess = null;
    }
    this.serverStatus = 'offline';
    this.startTime = null;
    this.rconService.disconnect();
    return { success: true, message: 'Server process killed immediately' };
  }

  public sendStdinCommand(cmd: string): boolean {
    if (this.serverProcess && this.serverProcess.stdin && !this.serverProcess.stdin.destroyed) {
      this.serverProcess.stdin.write(`${cmd}\n`);
      return true;
    }
    return false;
  }

  private async waitForExit(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (!this.serverProcess || this.serverProcess.killed) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }
}
