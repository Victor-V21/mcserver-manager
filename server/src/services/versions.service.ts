import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';
import { InstalledVersionInfo, McVersionManifest } from '../types';

export interface InstallOptions {
  mcVersion: string;
  loader: 'neoforge' | 'vanilla';
  loaderVersion?: string;
  javaVersion?: string;
  ramMin?: string;
  ramMax?: string;
  acceptEula: boolean;
}

export class VersionsService {
  private static instance: VersionsService;
  private configService: ConfigService;
  private isInstalling: boolean = false;
  private logListeners: ((line: string) => void)[] = [];
  private cachedNeoForgeVersions: string[] | null = null;
  private cacheTimestamp: number = 0;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): VersionsService {
    if (!VersionsService.instance) {
      VersionsService.instance = new VersionsService();
    }
    return VersionsService.instance;
  }

  public onLog(listener: (line: string) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  private emitLog(line: string): void {
    const formatted = `[INSTALLER] ${line}`;
    for (const listener of this.logListeners) {
      listener(formatted);
    }
  }

  public async getMinecraftManifest(): Promise<McVersionManifest> {
    try {
      const res = await axios.get<McVersionManifest>(
        'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
        { timeout: 8000 }
      );
      return res.data;
    } catch (err) {
      console.warn('Could not fetch Mojang manifest, providing fallback releases:', err);
      return {
        latest: { release: '1.21.4', snapshot: '25w07a' },
        versions: [
          { id: '1.21.4', type: 'release', url: '', releaseTime: '2024-12-03' },
          { id: '1.21.3', type: 'release', url: '', releaseTime: '2024-10-23' },
          { id: '1.21.1', type: 'release', url: '', releaseTime: '2024-08-08' },
          { id: '1.21', type: 'release', url: '', releaseTime: '2024-06-13' },
          { id: '1.20.6', type: 'release', url: '', releaseTime: '2024-04-29' },
          { id: '1.20.4', type: 'release', url: '', releaseTime: '2023-12-07' },
          { id: '1.20.2', type: 'release', url: '', releaseTime: '2023-09-21' },
          { id: '1.20.1', type: 'release', url: '', releaseTime: '2023-06-12' },
          { id: '1.19.4', type: 'release', url: '', releaseTime: '2023-03-14' },
          { id: '1.18.2', type: 'release', url: '', releaseTime: '2022-02-28' },
        ],
      };
    }
  }

  private async fetchAllNeoForgeVersions(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedNeoForgeVersions && now - this.cacheTimestamp < 10 * 60 * 1000) {
      return this.cachedNeoForgeVersions;
    }

    try {
      const res = await axios.get(
        'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml',
        { timeout: 8000 }
      );
      const xml = res.data as string;
      const regex = /<version>(.*?)<\/version>/g;
      const allVersions: string[] = [];
      let match;
      while ((match = regex.exec(xml)) !== null) {
        allVersions.push(match[1]);
      }
      this.cachedNeoForgeVersions = allVersions;
      this.cacheTimestamp = now;
      return allVersions;
    } catch (err) {
      console.warn('Could not fetch NeoForge versions from Maven, using cached or fallback:', err);
      if (this.cachedNeoForgeVersions) return this.cachedNeoForgeVersions;
      return ['21.1.250', '21.1.249', '21.1.65', '21.4.157', '20.4.251'];
    }
  }

  public async getNeoForgeVersions(mcVersion: string): Promise<string[]> {
    const allVersions = await this.fetchAllNeoForgeVersions();

    // Map MC version to NeoForge prefix:
    // In NeoForge official numbering:
    // Minecraft 1.21.1 -> NeoForge 21.1.x
    // Minecraft 1.21.4 -> NeoForge 21.4.x
    // Minecraft 1.21.0 / 1.21 -> NeoForge 21.0.x
    // Minecraft 1.20.4 -> NeoForge 20.4.x
    // Minecraft 1.20.6 -> NeoForge 20.6.x
    // Minecraft 1.20.2 -> NeoForge 20.2.x
    const parts = mcVersion.split('.');
    if (parts.length < 2) return [];

    const major = parts[1]; // e.g. "21" or "20"
    const minor = parts[2] !== undefined ? parts[2] : '0'; // e.g. "1" or "4"
    const prefix = `${major}.${minor}.`;

    const matched = allVersions.filter((v) => v.startsWith(prefix));

    // Sort descending by semantic / numeric build number
    return matched.sort((a, b) => {
      const numsA = a.replace(/[^0-9.]/g, '').split('.').map(Number);
      const numsB = b.replace(/[^0-9.]/g, '').split('.').map(Number);
      for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
        const diff = (numsB[i] || 0) - (numsA[i] || 0);
        if (diff !== 0) return diff;
      }
      return b.localeCompare(a);
    });
  }

  public getInstalledVersion(): InstalledVersionInfo {
    const serverDir = this.configService.resolvePath(SUBDIRS.SERVER);
    const versionInfoPath = path.join(serverDir, 'version-info.json');
    const eulaPath = this.configService.resolvePath(SUBDIRS.EULA);
    const startScriptPath = this.configService.resolvePath(SUBDIRS.START_SCRIPT);
    const runShPath = path.join(serverDir, 'run.sh');
    const serverJarPath = path.join(serverDir, 'server.jar');

    let eulaAccepted = false;
    if (fs.existsSync(eulaPath)) {
      try {
        const eulaContent = fs.readFileSync(eulaPath, 'utf-8');
        eulaAccepted = eulaContent.toLowerCase().includes('eula=true');
      } catch {}
    }

    const runScriptFound = fs.existsSync(startScriptPath) || fs.existsSync(runShPath);
    const serverJarFound = fs.existsSync(serverJarPath) || fs.existsSync(path.join(serverDir, 'run.jar'));

    if (fs.existsSync(versionInfoPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(versionInfoPath, 'utf-8'));
        return {
          installed: true,
          mcVersion: meta.mcVersion,
          loader: meta.loader,
          loaderVersion: meta.loaderVersion,
          javaVersion: meta.javaVersion,
          allocatedRamMin: meta.ramMin,
          allocatedRamMax: meta.ramMax,
          eulaAccepted,
          serverJarFound,
          runScriptFound,
        };
      } catch {}
    }

    return {
      installed: runScriptFound || serverJarFound,
      eulaAccepted,
      serverJarFound,
      runScriptFound,
    };
  }

  public async installVersion(options: InstallOptions): Promise<{ success: boolean; message: string }> {
    if (this.isInstalling) {
      throw new Error('Another version installation is currently in progress');
    }

    this.isInstalling = true;
    this.emitLog(`Starting installation of Minecraft ${options.mcVersion} (${options.loader})...`);

    const serverDir = this.configService.resolvePath(SUBDIRS.SERVER);
    const scriptsDir = this.configService.resolvePath(SUBDIRS.SCRIPTS);

    if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
    if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });

    try {
      if (options.acceptEula) {
        this.emitLog('Writing eula.txt (eula=true)...');
        fs.writeFileSync(path.join(serverDir, 'eula.txt'), 'eula=true\n', 'utf-8');
      }

      if (options.loader === 'neoforge') {
        await this.installNeoForge(options, serverDir, scriptsDir);
      } else {
        await this.installVanilla(options, serverDir, scriptsDir);
      }

      // Save version-info.json
      const meta = {
        mcVersion: options.mcVersion,
        loader: options.loader,
        loaderVersion: options.loaderVersion || 'latest',
        javaVersion: options.javaVersion || 'Java 21',
        ramMin: options.ramMin || '4G',
        ramMax: options.ramMax || '8G',
        installedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(serverDir, 'version-info.json'), JSON.stringify(meta, null, 2), 'utf-8');

      this.emitLog('Installation completed successfully! Ready to launch.');
      return { success: true, message: 'Server installed successfully' };
    } catch (err: any) {
      this.emitLog(`ERROR: Installation failed: ${err.message || err}`);
      throw err;
    } finally {
      this.isInstalling = false;
    }
  }

  private async installNeoForge(options: InstallOptions, serverDir: string, scriptsDir: string): Promise<void> {
    const loaderVer = options.loaderVersion || '21.1.65';
    const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVer}/neoforge-${loaderVer}-installer.jar`;
    const installerPath = path.join(serverDir, `neoforge-${loaderVer}-installer.jar`);

    this.emitLog(`Downloading NeoForge installer: ${installerUrl}`);
    const response = await axios({
      method: 'GET',
      url: installerUrl,
      responseType: 'stream',
      timeout: 30000,
    });

    const writer = fs.createWriteStream(installerPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', (err) => reject(err));
    });

    this.emitLog('Installer downloaded. Running headless server installation (this may take a few minutes)...');

    // Run java -jar neoforge-*-installer.jar --installServer
    await new Promise<void>((resolve, reject) => {
      const child = spawn('java', ['-jar', path.basename(installerPath), '--installServer'], {
        cwd: serverDir,
      });

      child.stdout.on('data', (data) => {
        this.emitLog(data.toString().trim());
      });

      child.stderr.on('data', (data) => {
        this.emitLog(data.toString().trim());
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.emitLog('NeoForge server installation succeeded.');
          resolve();
        } else {
          reject(new Error(`Installer exited with error code ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    // Clean up installer jar
    try {
      if (fs.existsSync(installerPath)) fs.unlinkSync(installerPath);
    } catch {}

    // Generate start.sh in scripts/
    const ramMin = options.ramMin || '4G';
    const ramMax = options.ramMax || '8G';
    const startScriptContent = `#!/bin/bash
set -e
cd "${serverDir}"
if [ -f "run.sh" ]; then
  chmod +x run.sh
  exec ./run.sh "$@"
else
  exec java -Xms${ramMin} -Xmx${ramMax} @user_jvm_args.txt @libraries/net/neoforged/neoforge/${loaderVer}/unix_args.txt nogui "$@"
fi
`;
    const startScriptPath = path.join(scriptsDir, 'start.sh');
    fs.writeFileSync(startScriptPath, startScriptContent, { mode: 0o755 });

    // Update user_jvm_args.txt if present
    const jvmArgsPath = path.join(serverDir, 'user_jvm_args.txt');
    const jvmContent = `# JVM Arguments set by MCServer Manager\n-Xms${ramMin}\n-Xmx${ramMax}\n`;
    fs.writeFileSync(jvmArgsPath, jvmContent, 'utf-8');
  }

  private async installVanilla(options: InstallOptions, serverDir: string, scriptsDir: string): Promise<void> {
    this.emitLog(`Resolving download URL for Minecraft Vanilla ${options.mcVersion}...`);
    const manifest = await this.getMinecraftManifest();
    const verEntry = manifest.versions.find((v) => v.id === options.mcVersion);

    let serverJarUrl = '';
    if (verEntry && verEntry.url) {
      const verMeta = await axios.get(verEntry.url, { timeout: 10000 });
      if (verMeta.data?.downloads?.server?.url) {
        serverJarUrl = verMeta.data.downloads.server.url;
      }
    }

    if (!serverJarUrl) {
      throw new Error(`Could not find server.jar download URL for Minecraft ${options.mcVersion}`);
    }

    this.emitLog(`Downloading vanilla server.jar from ${serverJarUrl}...`);
    const serverJarPath = path.join(serverDir, 'server.jar');
    const response = await axios({
      method: 'GET',
      url: serverJarUrl,
      responseType: 'stream',
      timeout: 30000,
    });

    const writer = fs.createWriteStream(serverJarPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', (err) => reject(err));
    });

    this.emitLog('Vanilla server.jar downloaded.');

    const ramMin = options.ramMin || '4G';
    const ramMax = options.ramMax || '8G';
    const startScriptContent = `#!/bin/bash
set -e
cd "${serverDir}"
exec java -Xms${ramMin} -Xmx${ramMax} -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -jar server.jar nogui "$@"
`;
    const startScriptPath = path.join(scriptsDir, 'start.sh');
    fs.writeFileSync(startScriptPath, startScriptContent, { mode: 0o755 });
  }

  public getLocalNeoForgeVersions(): { versions: any[]; activeVersion: string | null } {
    const serverDir = this.configService.resolvePath(SUBDIRS.SERVER);
    const discovered: Record<string, any> = {};

    // 1. Check libraries/net/neoforged/neoforge/<version>
    const neoForgeLibsDir = path.join(serverDir, 'libraries', 'net', 'neoforged', 'neoforge');
    if (fs.existsSync(neoForgeLibsDir)) {
      try {
        const dirs = fs.readdirSync(neoForgeLibsDir, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory()) {
            const ver = d.name;
            const hasUnixArgs = fs.existsSync(path.join(neoForgeLibsDir, ver, 'unix_args.txt'));
            const stat = fs.statSync(path.join(neoForgeLibsDir, ver));
            discovered[ver] = {
              version: ver,
              isInstalled: true,
              hasUnixArgs,
              source: 'libraries',
              modified: stat.mtime.toISOString(),
            };
          }
        }
      } catch {}
    }

    // 2. Check root of server for neoforge-*.jar or installers
    if (fs.existsSync(serverDir)) {
      try {
        const files = fs.readdirSync(serverDir);
        for (const f of files) {
          const match = f.match(/neoforge-([0-9a-zA-Z._-]+?)(?:-installer)?\.jar/i);
          if (match && match[1]) {
            const ver = match[1];
            const stat = fs.statSync(path.join(serverDir, f));
            discovered[ver] = {
              ...(discovered[ver] || {}),
              version: ver,
              hasInstallerJar: f.includes('installer'),
              jarFileName: f,
              modified: stat.mtime.toISOString(),
              source: discovered[ver]?.source || 'jar_file',
            };
          }
        }
      } catch {}
    }

    // 3. Read active version from active-version.json or version-info.json
    let activeVersion: string | null = null;
    const activeFile = path.join(serverDir, 'active-version.json');
    if (fs.existsSync(activeFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(activeFile, 'utf-8'));
        activeVersion = data.activeNeoForgeVersion || null;
      } catch {}
    }

    const versionList = Object.values(discovered);

    // Natural sort descending (newest build first)
    versionList.sort((a: any, b: any) => {
      const numsA = a.version.replace(/[^0-9.]/g, '').split('.').map(Number);
      const numsB = b.version.replace(/[^0-9.]/g, '').split('.').map(Number);
      for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
        const diff = (numsB[i] || 0) - (numsA[i] || 0);
        if (diff !== 0) return diff;
      }
      return b.version.localeCompare(a.version);
    });

    // If no active version is set and we found versions, default to the latest
    if (!activeVersion && versionList.length > 0) {
      const defaultVer = versionList[0].version;
      if (defaultVer) {
        activeVersion = defaultVer;
        this.setActiveNeoForgeVersion(defaultVer);
      }
    }

    const versionsWithActive = versionList.map((item: any) => ({
      ...item,
      isActive: item.version === activeVersion,
    }));

    return {
      versions: versionsWithActive,
      activeVersion,
    };
  }

  public setActiveNeoForgeVersion(version: string): { success: boolean; activeVersion: string } {
    const serverDir = this.configService.resolvePath(SUBDIRS.SERVER);
    const scriptsDir = this.configService.resolvePath(SUBDIRS.SCRIPTS);

    if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
    if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });

    // Save active-version.json
    const activeFile = path.join(serverDir, 'active-version.json');
    fs.writeFileSync(activeFile, JSON.stringify({ activeNeoForgeVersion: version, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');

    // Update start.sh to launch the selected active version
    const startScriptContent = `#!/bin/bash
set -e
cd "${serverDir}"

# Launch active NeoForge version: ${version}
if [ -f "libraries/net/neoforged/neoforge/${version}/unix_args.txt" ]; then
  exec java -Xms4G -Xmx8G @user_jvm_args.txt @libraries/net/neoforged/neoforge/${version}/unix_args.txt nogui "$@"
elif [ -f "run.sh" ]; then
  chmod +x run.sh
  exec ./run.sh "$@"
else
  exec java -Xms4G -Xmx8G -jar server.jar nogui "$@"
fi
`;
    fs.writeFileSync(path.join(scriptsDir, 'start.sh'), startScriptContent, { mode: 0o755 });
    this.emitLog(`Versión activa de NeoForge establecida en: ${version}`);

    return { success: true, activeVersion: version };
  }

  public async installLocalJar(jarFilePath: string, originalName: string): Promise<{ success: boolean; version: string }> {
    const serverDir = this.configService.resolvePath(SUBDIRS.SERVER);
    if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });

    // Extract version from file name (e.g. neoforge-21.1.20-installer.jar -> 21.1.20)
    let version = 'custom';
    const match = originalName.match(/neoforge-([0-9a-zA-Z._-]+?)(?:-installer)?\.jar/i);
    if (match && match[1]) {
      version = match[1];
    } else {
      const genMatch = originalName.match(/([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
      if (genMatch && genMatch[1]) {
        version = genMatch[1];
      }
    }

    this.emitLog(`Procesando archivo subido: ${originalName} (Versión detectada: ${version})...`);

    // If it's an installer, run headless server installation
    if (originalName.toLowerCase().includes('installer')) {
      this.emitLog(`Ejecutando instalador headless: java -jar ${originalName} --installServer`);
      await new Promise<void>((resolve, reject) => {
        const child = spawn('java', ['-jar', path.basename(jarFilePath), '--installServer'], {
          cwd: serverDir,
        });

        child.stdout.on('data', (data) => this.emitLog(data.toString().trim()));
        child.stderr.on('data', (data) => this.emitLog(data.toString().trim()));
        child.on('close', (code) => {
          if (code === 0) {
            this.emitLog(`Instalación de NeoForge ${version} completada con éxito.`);
            resolve();
          } else {
            reject(new Error(`El instalador salió con código ${code}`));
          }
        });
        child.on('error', (err) => reject(err));
      });
    }

    // Automatically set this newly uploaded/installed version as the active version!
    this.setActiveNeoForgeVersion(version);
    return { success: true, version };
  }
}

