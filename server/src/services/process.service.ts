import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from './config.service';
import { RconService } from './rcon.service';
import { SUBDIRS } from '../config/constants';
import modErrors from '../data/mod-errors.json';
import { CrashDiagnostic } from '../types';

export class ProcessService {
  private static instance: ProcessService;
  private configService: ConfigService;
  private rconService: RconService;
  private serverProcess: ChildProcess | null = null;
  private serverStatus: 'online' | 'offline' | 'starting' | 'stopping' = 'offline';
  private startTime: number | null = null;
  private isUserStopping: boolean = false;
  private lastCrashDiagnostic: CrashDiagnostic | null = null;
  private modErrorPatterns: any[] = modErrors;
  private logBuffer: string = '';

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.rconService = RconService.getInstance();
  }

  private parseLogForErrors(str?: string) {
    if (str) {
      this.logBuffer += str;
      if (this.logBuffer.length > 32768) {
        this.logBuffer = this.logBuffer.slice(-32768);
      }
    }

    const textToScan = str || this.logBuffer;

    // 1. Check for missing dependencies / loading failures pattern
    const reqRegex = /Mod\s+([a-zA-Z0-9_-]+)\s+requires\s+([a-zA-Z0-9_-]+)\s+([0-9a-zA-Z.-]+(?:\s+or\s+above[^\n\r]*)?)/gi;
    const culpritMods = new Set<string>();
    const missingDeps = new Set<string>();
    const details: string[] = [];

    let match;
    while ((match = reqRegex.exec(textToScan)) !== null) {
      const mod = match[1];
      const dep = match[2];
      const ver = match[3].replace(/\s+or\s+above/i, '+').trim();

      culpritMods.add(mod);
      missingDeps.add(`${dep} ${ver}`);
      const detailMsg = `Mod '${mod}' requiere la librería '${dep}' (${ver})`;
      if (!details.includes(detailMsg)) {
        details.push(detailMsg);
      }
    }

    if (culpritMods.size > 0) {
      this.lastCrashDiagnostic = {
        modName: Array.from(culpritMods).join(', '),
        missingDependencies: Array.from(missingDeps),
        error: 'El servidor no pudo iniciar debido a que faltan librerías y dependencias requeridas por los mods instalados.',
        solution: `Instala las dependencias requeridas (${Array.from(missingDeps).slice(0, 4).join(', ')}) en la carpeta de mods o desactiva temporalmente los mods que las solicitan.`,
        details: details.slice(0, 8),
        severity: 'error',
      };
      return;
    }

    if (this.lastCrashDiagnostic) return; // Ya tenemos un error detectado

    for (const rule of this.modErrorPatterns) {
      const patternRegex = new RegExp(rule.pattern, 'i');
      const errorMatch = patternRegex.exec(this.logBuffer);
      
      if (errorMatch) {
        const logAfterError = this.logBuffer.slice(errorMatch.index);
        const modRegex = new RegExp(rule.modRegex, 'ig');
        const matches = [...logAfterError.matchAll(modRegex)];
        
        if (matches.length > 0) {
          let modNames = [];
          let version = '';
          
          for (const match of matches) {
            let name = 'Desconocido';
            for (let i = 1; i < match.length; i++) {
              if (match[i]) {
                name = match[i];
                if ((rule.pattern.includes('Missing') || rule.pattern.includes('ModLoadingException')) && i === 1 && match[2]) {
                   version = match[2];
                }
                break;
              }
            }
            name = name.replace(/(_service|\.jar)$/i, '').split('@')[0];
            modNames.push(name);
          }
          
          const uniqueModNames = [...new Set(modNames)];
          const modName = uniqueModNames.join(',');
          
          let solution = rule.solution;
          if (version) {
            solution = solution.replace('$VERSION', version);
          } else {
            solution = solution.replace('$VERSION', 'específica');
          }

          this.lastCrashDiagnostic = {
            modName,
            error: rule.pattern,
            solution,
            severity: rule.severity || 'error',
          } as any;
          
          break;
        }
      }
    }
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
    crashDiagnostic?: CrashDiagnostic | null;
  } {
    const isRunning = this.serverProcess !== null && !this.serverProcess.killed;
    const uptime = isRunning && this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    return {
      isRunning,
      pid: this.serverProcess ? this.serverProcess.pid || null : null,
      status: this.serverStatus,
      uptime,
      crashDiagnostic: this.lastCrashDiagnostic,
    };
  }

  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.serverProcess && !this.serverProcess.killed) {
      return { success: false, message: 'Server is already running' };
    }

    const root = this.configService.getRootPath();
    const serverDir = this.configService.getServerDir();
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

    this.isUserStopping = false;
    this.serverStatus = 'starting';
    this.startTime = Date.now();
    this.lastCrashDiagnostic = null;
    this.logBuffer = '';

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
        this.parseLogForErrors(str);
        if (str.includes('Done (') || str.includes('! For help, type "help"') || str.includes('Server started')) {
          this.serverStatus = 'online';
          this.lastCrashDiagnostic = null; // Clean if successfully started
        }
      });

      child.stderr.on('data', (chunk) => {
        logStream.write(chunk);
        const str = chunk.toString();
        this.parseLogForErrors(str);
      });

      child.on('close', async (code) => {
        console.log(`[ProcessService] Server process exited with code ${code} (previous status: ${this.serverStatus})`);
        const wasStarting = this.serverStatus === 'starting';
        const hadDiagnostic = this.lastCrashDiagnostic !== null;
        const wasUserStopping = this.isUserStopping;

        this.serverProcess = null;
        this.serverStatus = 'offline';
        this.startTime = null;
        this.isUserStopping = false;
        this.rconService.disconnect();

        const config = this.configService.getConfig();
        const isCrashOrAbnormal = !wasUserStopping && (wasStarting || hadDiagnostic || code !== 0);

        if (config.aiDiagnosticEnabled && isCrashOrAbnormal) {
          console.log(`[ProcessService] Triggering AI Crash Analysis (code=${code}, wasStarting=${wasStarting}, hadDiagnostic=${hadDiagnostic})...`);
          const fallbackResult = this.lastCrashDiagnostic; // Save regex result
          try {
            const { AiService } = await import('./ai.service');
            const { ModsService } = await import('./mods.service');
            const aiService = AiService.getInstance();
            const modsService = ModsService.getInstance();
            const mods = modsService.listMods().map(m => m.filename);

            this.lastCrashDiagnostic = {
              modName: 'Analizando con IA...',
              error: 'Esperando respuesta de Gemini',
              solution: 'Leyendo logs del servidor con IA...',
              severity: 'warning'
            };

            const crashContext = this.getCrashContext();
            console.log(`[ProcessService] Sending rich crash context to AI (crashReport: ${Boolean(crashContext.crashReport)}, mods: ${crashContext.mods.length})...`);
            const aiResult = await aiService.analyzeCrash(crashContext);
            if (aiResult) {
              console.log('[ProcessService] AI Diagnosis successfully updated:', aiResult.modName);
              this.lastCrashDiagnostic = aiResult;
            } else {
              console.log('[ProcessService] AI returned null, retaining fallback diagnostic.');
              this.lastCrashDiagnostic = fallbackResult;
            }
          } catch (e) {
            console.error("[ProcessService] AI crash analysis exception:", e);
            this.lastCrashDiagnostic = fallbackResult;
          }
        }
      });

      child.on('error', (err) => {
        console.error('Failed to start server process:', err);
        this.serverProcess = null;
        this.serverStatus = 'offline';
        this.startTime = null;
      });

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

    this.isUserStopping = true;
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

  public getCrashContext(): {
    logs: string;
    mods: string[];
    crashReport?: string;
    mcVersion?: string;
    loader?: string;
    loaderVersion?: string;
    javaVersion?: string;
  } {
    const serverDir = this.configService.getServerDir();
    const logsDir = path.join(serverDir, 'logs');
    const crashReportsDir = path.join(serverDir, 'crash-reports');

    // 1. Crash report file check
    let crashReport = '';
    if (fs.existsSync(crashReportsDir)) {
      try {
        const files = fs.readdirSync(crashReportsDir)
          .filter(f => f.startsWith('crash-') && f.endsWith('.txt'))
          .map(f => ({ name: f, time: fs.statSync(path.join(crashReportsDir, f)).mtimeMs }))
          .sort((a, b) => b.time - a.time);
        if (files.length > 0 && Date.now() - files[0].time < 48 * 60 * 60 * 1000) {
          crashReport = fs.readFileSync(path.join(crashReportsDir, files[0].name), 'utf8');
        }
      } catch (err) {
        console.warn('[ProcessService] Could not read crash-reports:', err);
      }
    }

    // 2. Logs from disk or buffer
    let logs = this.logBuffer;
    const logFile = path.join(logsDir, 'latest.log');
    if (fs.existsSync(logFile)) {
      try {
        const diskLog = fs.readFileSync(logFile, 'utf8');
        if (diskLog && diskLog.length > 0) {
          logs = diskLog;
        }
      } catch {}
    }

    // 3. Mods list
    let mods: string[] = [];
    try {
      const modsDir = path.join(serverDir, 'mods');
      if (fs.existsSync(modsDir)) {
        mods = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar') || f.endsWith('.disabled'));
      }
    } catch {}

    // 4. Version info
    let mcVersion = '1.21.1';
    let loader = 'neoforge';
    let loaderVersion = '';
    let javaVersion = 'Java 21';
    try {
      const { VersionsService } = require('./versions.service');
      const verInfo = VersionsService.getInstance().getInstalledVersion();
      if (verInfo) {
        if (verInfo.mcVersion) mcVersion = verInfo.mcVersion;
        if (verInfo.loader) loader = verInfo.loader;
        if (verInfo.loaderVersion) loaderVersion = verInfo.loaderVersion;
        if (verInfo.javaVersion) javaVersion = verInfo.javaVersion;
      }
    } catch {}

    return {
      logs,
      mods,
      crashReport,
      mcVersion,
      loader,
      loaderVersion,
      javaVersion,
    };
  }

  public async triggerAiDiagnostic(): Promise<{ success: boolean; diagnostic: any; message?: string }> {
    const config = this.configService.getConfig();
    if (!config.aiDiagnosticEnabled || !config.aiApiKey) {
      return { success: false, diagnostic: null, message: 'La IA no está habilitada o falta la API Key' };
    }

    const { AiService } = await import('./ai.service');
    const aiService = AiService.getInstance();

    this.lastCrashDiagnostic = {
      modName: 'Analizando con IA...',
      error: 'Esperando respuesta de Gemini',
      solution: 'Leyendo logs del servidor con IA...',
      severity: 'warning'
    };

    const crashContext = this.getCrashContext();
    const aiResult = await aiService.analyzeCrash(crashContext);
    if (aiResult) {
      this.lastCrashDiagnostic = aiResult;
      return { success: true, diagnostic: aiResult };
    } else {
      // Fallback to our enhanced parser so user is never left with an empty or ambiguous diagnostic
      this.lastCrashDiagnostic = null;
      this.parseLogForErrors(crashContext.crashReport || crashContext.logs);
      if (this.lastCrashDiagnostic) {
        return { 
          success: true, 
          diagnostic: this.lastCrashDiagnostic, 
          message: 'Diagnóstico contextual generado exitosamente (Gemini experimenta alta demanda 503)' 
        };
      }
      return { 
        success: false, 
        diagnostic: null, 
        message: 'No se pudo generar el diagnóstico en este momento' 
      };
    }
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
