import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from './config.service';
import { PropertiesService } from './properties.service';
import { SUBDIRS } from '../config/constants';
import modErrors from '../data/mod-errors.json';
import { CrashDiagnostic } from '../types';

type ProcessState = 'online' | 'offline' | 'starting' | 'stopping';

/** Owns the Minecraft process running in the same container as the panel. */
export class ProcessService {
  private static instance: ProcessService;
  private configService: ConfigService;
  private serverProcess: ChildProcess | null = null;
  private serverStatus: ProcessState = 'offline';
  private startTime: number | null = null;
  private isUserStopping = false;
  private lastCrashDiagnostic: CrashDiagnostic | null = null;
  private modErrorPatterns: any[] = modErrors;
  private logBuffer = '';

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): ProcessService {
    if (!ProcessService.instance) ProcessService.instance = new ProcessService();
    return ProcessService.instance;
  }

  private parseLogForErrors(chunk?: string): void {
    if (chunk) {
      this.logBuffer += chunk;
      if (this.logBuffer.length > 32768) this.logBuffer = this.logBuffer.slice(-32768);
    }

    const reqRegex = /Mod\s+([a-zA-Z0-9_-]+)\s+requires\s+([a-zA-Z0-9_-]+)\s+([0-9a-zA-Z.-]+(?:\s+or\s+above[^\n\r]*)?)/gi;
    const culpritMods = new Set<string>();
    const missingDeps = new Set<string>();
    const details: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = reqRegex.exec(this.logBuffer)) !== null) {
      const mod = match[1];
      const dependency = match[2];
      const version = match[3].replace(/\s+or\s+above/i, '+').trim();
      culpritMods.add(mod);
      missingDeps.add(`${dependency} ${version}`);
      details.push(`Mod '${mod}' requiere la librería '${dependency}' (${version})`);
    }

    if (culpritMods.size > 0) {
      this.lastCrashDiagnostic = {
        modName: Array.from(culpritMods).join(', '),
        missingDependencies: Array.from(missingDeps),
        error: 'El servidor no pudo iniciar debido a dependencias faltantes de los mods instalados.',
        solution: `Instala las dependencias requeridas (${Array.from(missingDeps).slice(0, 4).join(', ')}) en server/mods o desactiva los mods que las solicitan.`,
        details: [...new Set(details)].slice(0, 8),
        severity: 'error',
      };
      return;
    }

    if (this.lastCrashDiagnostic) return;
    for (const rule of this.modErrorPatterns) {
      const errorMatch = new RegExp(rule.pattern, 'i').exec(this.logBuffer);
      if (!errorMatch) continue;
      const logAfterError = this.logBuffer.slice(errorMatch.index);
      const matches = [...logAfterError.matchAll(new RegExp(rule.modRegex, 'ig'))];
      if (matches.length === 0) continue;

      let version = '';
      const modNames = matches.map((modMatch) => {
        let name = 'Desconocido';
        for (let i = 1; i < modMatch.length; i += 1) {
          if (modMatch[i]) {
            name = modMatch[i];
            if ((rule.pattern.includes('Missing') || rule.pattern.includes('ModLoadingException')) && i === 1 && modMatch[2]) {
              version = modMatch[2];
            }
            break;
          }
        }
        return name.replace(/(_service|\.jar)$/i, '').split('@')[0];
      });

      this.lastCrashDiagnostic = {
        modName: [...new Set(modNames)].join(','),
        error: rule.pattern,
        solution: rule.solution.replace('$VERSION', version || 'específica'),
        severity: rule.severity || 'error',
      } as CrashDiagnostic;
      return;
    }
  }

  public async getStatus(): Promise<{
    isRunning: boolean;
    pid: number | null;
    status: ProcessState;
    uptime: number;
    crashDiagnostic?: CrashDiagnostic | null;
    cpuPercent?: number;
    memoryBytes?: number;
  }> {
    const isRunning = this.serverProcess !== null && !this.serverProcess.killed;
    return {
      isRunning,
      pid: this.serverProcess?.pid || null,
      status: this.serverStatus,
      uptime: isRunning && this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      crashDiagnostic: this.lastCrashDiagnostic,
    };
  }

  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.serverProcess && !this.serverProcess.killed) {
      return { success: false, message: 'El servidor ya está ejecutándose' };
    }

    const root = this.configService.getRootPath();
    const serverDir = this.configService.getServerDir();
    const serverRunScript = path.join(serverDir, 'run.sh');
    const serverStartScript = path.join(serverDir, 'start.sh');
    const managerStartScript = path.join(root, SUBDIRS.START_SCRIPT);
    const serverJar = path.join(serverDir, 'server.jar');

    let command: string;
    let args: string[];
    let cwd = serverDir;

    // NeoForge's scripts are relative to the server directory and are the
    // most reliable source of the selected loader, JVM args and mods.
    if (fs.existsSync(serverRunScript)) {
      command = '/bin/bash';
      args = [serverRunScript, 'nogui'];
    } else if (fs.existsSync(serverStartScript)) {
      command = '/bin/bash';
      args = [serverStartScript, 'nogui'];
    } else if (fs.existsSync(managerStartScript)) {
      command = '/bin/bash';
      args = [managerStartScript, 'nogui'];
      cwd = path.dirname(managerStartScript);
    } else if (fs.existsSync(serverJar)) {
      command = 'java';
      const userJvmArgs = path.join(serverDir, 'user_jvm_args.txt');
      args = fs.existsSync(userJvmArgs)
        ? [`@${userJvmArgs}`, '-jar', 'server.jar', 'nogui']
        : ['-jar', 'server.jar', 'nogui'];
    } else {
      throw new Error('No se encontró un servidor ejecutable. Instala una versión de Minecraft primero.');
    }

    // Create the initial configuration before the first boot so a new server
    // starts with the panel's explicit offline-mode policy.
    PropertiesService.getInstance().ensurePropertiesFile();

    this.isUserStopping = false;
    this.serverStatus = 'starting';
    this.startTime = Date.now();
    this.lastCrashDiagnostic = null;
    this.logBuffer = '';

    const logsDir = path.join(serverDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const logStream = fs.createWriteStream(path.join(logsDir, 'latest.log'), { flags: 'a' });

    try {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.serverProcess = child;

      const handleOutput = (chunk: Buffer | string) => {
        const text = chunk.toString();
        logStream.write(text);
        this.parseLogForErrors(text);
        if (text.includes('Done (') || text.includes('For help, type') || text.includes('Server started')) {
          this.serverStatus = 'online';
          this.lastCrashDiagnostic = null;
        }
      };

      child.stdout?.on('data', handleOutput);
      child.stderr?.on('data', handleOutput);
      child.on('close', async (code) => {
        const wasStarting = this.serverStatus === 'starting';
        const hadDiagnostic = this.lastCrashDiagnostic !== null;
        const wasUserStopping = this.isUserStopping;
        this.serverProcess = null;
        this.serverStatus = 'offline';
        this.startTime = null;
        this.isUserStopping = false;
        logStream.end();

        const config = this.configService.getConfig();
        const abnormalExit = !wasUserStopping && (wasStarting || hadDiagnostic || code !== 0);
        if (!config.aiDiagnosticEnabled || !abnormalExit) return;

        const fallbackResult = this.lastCrashDiagnostic;
        try {
          const { AiService } = await import('./ai.service');
          const { ModsService } = await import('./mods.service');
          const mods = ModsService.getInstance().listMods().map((mod) => mod.filename);
          this.lastCrashDiagnostic = {
            modName: 'Analizando con IA...',
            error: 'Esperando respuesta del diagnóstico',
            solution: 'Leyendo los registros del servidor...',
            severity: 'warning',
          };
          const result = await AiService.getInstance().analyzeCrash({ ...this.getCrashContext(), mods });
          this.lastCrashDiagnostic = result || fallbackResult;
        } catch (error) {
          console.error('[ProcessService] Error en diagnóstico de crash:', error);
          this.lastCrashDiagnostic = fallbackResult;
        }
      });
      child.on('error', (error) => {
        console.error('[ProcessService] No se pudo iniciar Minecraft:', error);
        this.serverProcess = null;
        this.serverStatus = 'offline';
        this.startTime = null;
        logStream.end();
      });

      return { success: true, message: 'Servidor Minecraft iniciado' };
    } catch (error: any) {
      logStream.end();
      this.serverStatus = 'offline';
      this.startTime = null;
      throw new Error(`No se pudo iniciar el proceso de Minecraft: ${error.message}`);
    }
  }

  public async stop(): Promise<{ success: boolean; message: string }> {
    if (!this.serverProcess || this.serverProcess.killed) {
      this.serverStatus = 'offline';
      return { success: false, message: 'El servidor no está ejecutándose' };
    }

    this.isUserStopping = true;
    this.serverStatus = 'stopping';
    this.sendCommand('stop');
    if (await this.waitForExit(25000)) return { success: true, message: 'Servidor detenido correctamente' };

    console.warn('[ProcessService] Minecraft no respondió a stop; enviando SIGTERM');
    this.serverProcess?.kill('SIGTERM');
    if (await this.waitForExit(5000)) return { success: true, message: 'Servidor detenido con SIGTERM' };
    return this.kill();
  }

  public async restart(): Promise<{ success: boolean; message: string }> {
    if (this.serverProcess && !this.serverProcess.killed) await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.start();
  }

  public async kill(): Promise<{ success: boolean; message: string }> {
    this.isUserStopping = true;
    if (this.serverProcess && !this.serverProcess.killed) this.serverProcess.kill('SIGKILL');
    this.serverProcess = null;
    this.serverStatus = 'offline';
    this.startTime = null;
    return { success: true, message: 'Proceso de Minecraft finalizado inmediatamente' };
  }

  public sendCommand(command: string): boolean {
    const cleanCommand = command.replace(/[\r\n]/g, ' ').trim().replace(/^\/+/, '');
    if (!cleanCommand || !this.serverProcess?.stdin || this.serverProcess.stdin.destroyed) return false;
    this.serverProcess.stdin.write(`${cleanCommand}\n`);
    return true;
  }

  public async shutdown(): Promise<void> {
    if (this.serverProcess && !this.serverProcess.killed) await this.stop();
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
    let crashReport = '';

    try {
      if (fs.existsSync(crashReportsDir)) {
        const latest = fs.readdirSync(crashReportsDir)
          .filter((file) => file.startsWith('crash-') && file.endsWith('.txt'))
          .map((file) => ({ file, time: fs.statSync(path.join(crashReportsDir, file)).mtimeMs }))
          .sort((a, b) => b.time - a.time)[0];
        if (latest && Date.now() - latest.time < 48 * 60 * 60 * 1000) {
          crashReport = fs.readFileSync(path.join(crashReportsDir, latest.file), 'utf8');
        }
      }
    } catch (error) {
      console.warn('[ProcessService] No se pudo leer el crash report:', error);
    }

    let logs = this.logBuffer;
    try {
      const latestLog = path.join(logsDir, 'latest.log');
      if (fs.existsSync(latestLog)) logs = fs.readFileSync(latestLog, 'utf8') || logs;
    } catch {}

    let mods: string[] = [];
    try {
      const modsDir = path.join(serverDir, 'mods');
      if (fs.existsSync(modsDir)) mods = fs.readdirSync(modsDir).filter((file) => /\.(jar|disabled)$/i.test(file));
    } catch {}

    let versionInfo: any = {};
    try {
      const { VersionsService } = require('./versions.service');
      versionInfo = VersionsService.getInstance().getInstalledVersion() || {};
    } catch {}

    return {
      logs,
      mods,
      crashReport,
      mcVersion: versionInfo.mcVersion || undefined,
      loader: versionInfo.loader || undefined,
      loaderVersion: versionInfo.loaderVersion || undefined,
      javaVersion: versionInfo.javaVersion || undefined,
    };
  }

  public async triggerAiDiagnostic(): Promise<{ success: boolean; diagnostic: any; message?: string }> {
    const config = this.configService.getConfig();
    if (!config.aiDiagnosticEnabled || !config.aiApiKey) {
      return { success: false, diagnostic: null, message: 'La IA no está habilitada o falta la API Key' };
    }

    const { AiService } = await import('./ai.service');
    this.lastCrashDiagnostic = {
      modName: 'Analizando con IA...',
      error: 'Esperando respuesta del diagnóstico',
      solution: 'Leyendo los registros del servidor...',
      severity: 'warning',
    };
    const context = this.getCrashContext();
    const result = await AiService.getInstance().analyzeCrash(context);
    if (result) {
      this.lastCrashDiagnostic = result;
      return { success: true, diagnostic: result };
    }

    this.lastCrashDiagnostic = null;
    this.parseLogForErrors(context.crashReport || context.logs);
    return this.lastCrashDiagnostic
      ? { success: true, diagnostic: this.lastCrashDiagnostic, message: 'Diagnóstico local generado desde los registros' }
      : { success: false, diagnostic: null, message: 'No se pudo generar el diagnóstico en este momento' };
  }

  private async waitForExit(timeoutMs: number): Promise<boolean> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (!this.serverProcess || this.serverProcess.killed) return true;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  }
}
