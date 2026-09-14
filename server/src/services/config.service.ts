import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PanelConfig } from '../types';
import { DEFAULT_SERVER_ROOT, DEFAULT_PORT, PANEL_CONFIG_FILE, SUBDIRS } from '../config/constants';

export class ConfigService {
  private static instance: ConfigService;
  private config: PanelConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.ensureDirectoryStructure();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): PanelConfig {
    if (fs.existsSync(PANEL_CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(PANEL_CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.passwordHash) {
          parsed.passwordHash = bcrypt.hashSync(process.env.MASTER_PASSWORD || 'admin', 10);
          parsed.initialSetupDone = true;
          this.saveConfig(parsed);
        }
        return parsed;
      } catch (err) {
        console.error('Failed to parse panel-config.json, re-initializing:', err);
      }
    }

    // Default configuration
    const envMasterPassword = process.env.MASTER_PASSWORD || 'admin';
    const defaultSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    const passwordHash = bcrypt.hashSync(envMasterPassword, 10);

    const newConfig: PanelConfig = {
      rootPath: DEFAULT_SERVER_ROOT,
      port: DEFAULT_PORT,
      jwtSecret: defaultSecret,
      passwordHash,
      initialSetupDone: true,
    };

    this.saveConfig(newConfig);
    return newConfig;
  }

  public getConfig(): PanelConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: PanelConfig): void {
    const tmpFile = `${PANEL_CONFIG_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(newConfig, null, 2), 'utf-8');
    fs.renameSync(tmpFile, PANEL_CONFIG_FILE);
    this.config = newConfig;
  }

  public setRootPath(newPath: string): { success: boolean; message?: string } {
    if (!newPath || typeof newPath !== 'string') {
      return { success: false, message: 'Invalid directory path' };
    }

    const resolved = path.resolve(newPath);
    this.config.rootPath = resolved;
    this.saveConfig(this.config);
    this.ensureDirectoryStructure();
    return { success: true };
  }

  public setPassword(rawPassword: string): void {
    const hash = bcrypt.hashSync(rawPassword, 10);
    this.config.passwordHash = hash;
    this.config.initialSetupDone = true;
    this.saveConfig(this.config);
  }

  public getRootPath(): string {
    return this.config.rootPath;
  }

  public getServerDir(): string {
    const root = this.config.rootPath;
    const standardServerDir = path.join(root, SUBDIRS.SERVER);

    // 1. If host has /server directly and it contains files or is a directory with items
    if (fs.existsSync('/server') && fs.statSync('/server').isDirectory()) {
      try {
        const files = fs.readdirSync('/server');
        if (files.length > 0) return '/server';
      } catch {}
    }

    // 2. If standard <rootPath>/server exists, use it
    if (fs.existsSync(standardServerDir)) {
      return standardServerDir;
    }

    // 3. If root itself contains server files (e.g. libraries, server.properties, run.sh, eula.txt)
    const indicators = ['server.properties', 'libraries', 'run.sh', 'eula.txt', 'version-info.json'];
    const hasIndicators = indicators.some((f) => fs.existsSync(path.join(root, f)));
    if (hasIndicators) {
      return root;
    }

    return standardServerDir;
  }

  public resolvePath(...subpaths: string[]): string {
    if (subpaths.length > 0) {
      const fullSubpath = path.join(...subpaths);
      if (fullSubpath === 'server' || fullSubpath === SUBDIRS.SERVER) {
        return this.getServerDir();
      }
      if (fullSubpath.startsWith('server' + path.sep) || fullSubpath.startsWith('server/')) {
        const rel = fullSubpath.slice(7); // strip 'server/'
        return path.resolve(this.getServerDir(), rel);
      }
    }
    return path.resolve(this.config.rootPath, ...subpaths);
  }

  public ensureDirectoryStructure(): void {
    const root = this.config.rootPath;
    const dirs = [
      root,
      path.join(root, SUBDIRS.SERVER),
      path.join(root, SUBDIRS.MODS),
      path.join(root, SUBDIRS.LOGS),
      path.join(root, SUBDIRS.PLAYIT),
      path.join(root, SUBDIRS.SCRIPTS),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (err) {
          console.warn(`Could not create directory ${dir}:`, err);
        }
      }
    }
  }

  public validateDirectories(targetPath?: string): {
    rootExists: boolean;
    serverExists: boolean;
    modsExists: boolean;
    logsExists: boolean;
    propertiesExists: boolean;
    playitExists: boolean;
    scriptsExists: boolean;
  } {
    const root = targetPath ? path.resolve(targetPath) : this.config.rootPath;
    return {
      rootExists: fs.existsSync(root),
      serverExists: fs.existsSync(path.join(root, SUBDIRS.SERVER)),
      modsExists: fs.existsSync(path.join(root, SUBDIRS.MODS)),
      logsExists: fs.existsSync(path.join(root, SUBDIRS.LOGS)),
      propertiesExists: fs.existsSync(path.join(root, SUBDIRS.PROPERTIES)),
      playitExists: fs.existsSync(path.join(root, SUBDIRS.PLAYIT)),
      scriptsExists: fs.existsSync(path.join(root, SUBDIRS.SCRIPTS)),
    };
  }
}
