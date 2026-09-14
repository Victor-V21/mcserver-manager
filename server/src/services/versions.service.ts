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
      console.warn('Could not fetch NeoForge versions from Maven, reading disk versions:', err);
      if (this.cachedNeoForgeVersions) return this.cachedNeoForgeVersions;
      // No mock arrays: return versions discovered on disk
      const local = this.detectServerFromDisk();
      return local.versions.map((v) => v.version);
    }
  }

  /**
   * Deterministically map a NeoForge version string to its matching Minecraft version
   * NeoForge official semantic schema:
   * 21.1.x -> 1.21.1
   * 21.4.x -> 1.21.4
   * 21.0.x -> 1.21
   * 20.4.x -> 1.20.4
   * 20.6.x -> 1.20.6
   * 20.2.x -> 1.20.2
   * X.Y.Z  -> 1.X.Y (if Y is 0 -> 1.X)
   */
  public mapNeoForgeToMinecraftVersion(neoVer: string): string | null {
    if (!neoVer) return null;
    const clean = neoVer.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length >= 2) {
      const major = parts[0];
      const minor = parts[1];
      if (minor === '0') {
        return `1.${major}`;
      }
      return `1.${major}.${minor}`;
    }
    return null;
  }

  /**
   * Autodetects the Minecraft and NeoForge/Engine versions directly from the server root directory on disk
   * without using mock data or fabricated responses.
   */
  public detectServerFromDisk(): {
    installed: boolean;
    serverDir: string;
    mcVersion: string | null;
    loader: 'neoforge' | 'forge' | 'vanilla' | 'custom' | null;
    loaderVersion: string | null;
    activeVersion: string | null;
    versions: Array<{
      version: string;
      mcVersion?: string;
      isInstalled: boolean;
      isActive: boolean;
      hasUnixArgs?: boolean;
      hasInstallerJar?: boolean;
      jarFileName?: string;
      source: string;
      modified?: string;
    }>;
    eulaAccepted: boolean;
    serverJarFound: boolean;
    runScriptFound: boolean;
    formattedVersion: string;
  } {
    const serverDir = this.configService.resolvePath(SUBDIRS.SERVER);
    const discovered: Record<string, any> = {};

    let detectedMcFromLibs: string | null = null;
    let detectedMcFromMcLibs: string | null = null;
    let detectedNeoFromLogs: string | null = null;
    let detectedMcFromLogs: string | null = null;

    // 1. Check active-version.json if present
    let activeVersion: string | null = null;
    const activeFile = path.join(serverDir, 'active-version.json');
    if (fs.existsSync(activeFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(activeFile, 'utf-8'));
        if (data.activeNeoForgeVersion) {
          activeVersion = data.activeNeoForgeVersion;
        }
      } catch {}
    }

    // 2. Check start.sh or run.sh to see which version is actively configured to run
    const scriptsStart = this.configService.resolvePath(SUBDIRS.START_SCRIPT);
    const runSh = path.join(serverDir, 'run.sh');
    for (const scriptPath of [scriptsStart, runSh]) {
      if (fs.existsSync(scriptPath)) {
        try {
          const content = fs.readFileSync(scriptPath, 'utf-8');
          const match = content.match(/libraries\/net\/neoforged\/neoforge\/([0-9a-zA-Z._-]+)\/unix_args\.txt/);
          if (match && match[1] && !activeVersion) {
            activeVersion = match[1];
          }
        } catch {}
      }
    }

    // 3. Scan libraries/net/neoforged/neoforge/<version>
    const neoForgeLibsDir = path.join(serverDir, 'libraries', 'net', 'neoforged', 'neoforge');
    if (fs.existsSync(neoForgeLibsDir)) {
      try {
        const dirs = fs.readdirSync(neoForgeLibsDir, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory()) {
            const ver = d.name;
            const unixArgsPath = path.join(neoForgeLibsDir, ver, 'unix_args.txt');
            const hasUnixArgs = fs.existsSync(unixArgsPath);
            const stat = fs.statSync(path.join(neoForgeLibsDir, ver));

            let deducedMc = this.mapNeoForgeToMinecraftVersion(ver);
            if (hasUnixArgs) {
              try {
                const argsContent = fs.readFileSync(unixArgsPath, 'utf-8');
                const mcMatch =
                  argsContent.match(/--fml\.mcVersion\s+([0-9.]+)/) ||
                  argsContent.match(/minecraft\/server\/([0-9.]+)\/server-/);
                if (mcMatch && mcMatch[1]) {
                  deducedMc = mcMatch[1];
                }
              } catch {}
            }

            if (deducedMc && !detectedMcFromLibs) {
              detectedMcFromLibs = deducedMc;
            }

            discovered[ver] = {
              version: ver,
              mcVersion: deducedMc || undefined,
              isInstalled: true,
              hasUnixArgs,
              source: 'libraries',
              modified: stat.mtime.toISOString(),
            };
          }
        }
      } catch {}
    }

    // 4. Scan libraries/net/minecraft/server/<mcVersion>
    const mcLibsDir = path.join(serverDir, 'libraries', 'net', 'minecraft', 'server');
    if (fs.existsSync(mcLibsDir)) {
      try {
        const dirs = fs.readdirSync(mcLibsDir, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory() && /^[0-9.]+$/.test(d.name)) {
            detectedMcFromMcLibs = d.name;
            break;
          }
        }
      } catch {}
    }

    // 5. Scan root of server for jar files (neoforge, forge, vanilla)
    let serverJarFound = false;
    if (fs.existsSync(serverDir)) {
      try {
        const files = fs.readdirSync(serverDir);
        for (const f of files) {
          if (f.toLowerCase().endsWith('.jar')) {
            serverJarFound = true;
            const neoMatch = f.match(/neoforge-([0-9a-zA-Z._-]+?)(?:-installer)?\.jar/i);
            if (neoMatch && neoMatch[1]) {
              const ver = neoMatch[1];
              const stat = fs.statSync(path.join(serverDir, f));
              const deducedMc = this.mapNeoForgeToMinecraftVersion(ver);
              discovered[ver] = {
                ...(discovered[ver] || {}),
                version: ver,
                mcVersion: discovered[ver]?.mcVersion || deducedMc || undefined,
                hasInstallerJar: f.includes('installer'),
                jarFileName: f,
                modified: stat.mtime.toISOString(),
                source: discovered[ver]?.source || 'jar_file',
              };
            }
          }
        }
      } catch {}
    }

    // 6. Scan logs/latest.log for telemetry on previous boots
    const latestLogPath = path.join(serverDir, 'logs', 'latest.log');
    if (fs.existsSync(latestLogPath)) {
      try {
        const content = fs.readFileSync(latestLogPath, 'utf-8');
        const neoMatch = content.match(/NeoForge Version:\s*([0-9.]+)/i);
        if (neoMatch && neoMatch[1]) detectedNeoFromLogs = neoMatch[1];
        const mcMatch = content.match(/(?:Minecraft Version:\s*([0-9.]+)|Starting minecraft server version\s*([0-9.]+))/i);
        if (mcMatch) detectedMcFromLogs = mcMatch[1] || mcMatch[2];
      } catch {}
    }

    // 7. Check EULA & scripts
    let eulaAccepted = false;
    const eulaPath = path.join(serverDir, 'eula.txt');
    if (fs.existsSync(eulaPath)) {
      try {
        eulaAccepted = fs.readFileSync(eulaPath, 'utf-8').toLowerCase().includes('eula=true');
      } catch {}
    }

    const runScriptFound =
      fs.existsSync(scriptsStart) ||
      fs.existsSync(runSh) ||
      fs.existsSync(path.join(serverDir, 'start.sh'));

    const versionList = Object.values(discovered);
    // Sort descending by semantic version
    versionList.sort((a: any, b: any) => {
      const numsA = a.version.replace(/[^0-9.]/g, '').split('.').map(Number);
      const numsB = b.version.replace(/[^0-9.]/g, '').split('.').map(Number);
      for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
        const diff = (numsB[i] || 0) - (numsA[i] || 0);
        if (diff !== 0) return diff;
      }
      return b.version.localeCompare(a.version);
    });

    if (!activeVersion && versionList.length > 0) {
      const topVer = versionList[0].version;
      if (topVer) {
        activeVersion = topVer;
        try {
          this.setActiveNeoForgeVersion(topVer);
        } catch {}
      }
    }

    const versionsWithActive = versionList.map((item: any) => ({
      ...item,
      isActive: item.version === activeVersion,
    }));

    // Primary detected NeoForge version
    const primaryNeoVersion = activeVersion || (versionList.length > 0 ? versionList[0].version : null) || detectedNeoFromLogs;

    // Primary detected Minecraft version
    let primaryMcVersion =
      detectedMcFromMcLibs ||
      detectedMcFromLogs ||
      (primaryNeoVersion ? this.mapNeoForgeToMinecraftVersion(primaryNeoVersion) : null) ||
      detectedMcFromLibs;

    // Also check version-info.json for fallback if disk didn't specify mcVersion
    const versionInfoPath = path.join(serverDir, 'version-info.json');
    if (fs.existsSync(versionInfoPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(versionInfoPath, 'utf-8'));
        if (meta.mcVersion && !primaryMcVersion) primaryMcVersion = meta.mcVersion;
      } catch {}
    }

    const isInstalled =
      versionList.length > 0 ||
      serverJarFound ||
      runScriptFound ||
      Boolean(detectedMcFromLibs || detectedMcFromMcLibs);

    let loader: 'neoforge' | 'forge' | 'vanilla' | 'custom' | null = null;
    if (versionList.length > 0 || primaryNeoVersion) {
      loader = 'neoforge';
    } else if (serverJarFound || runScriptFound) {
      loader = 'vanilla';
    }

    let formattedVersion = '';
    if (isInstalled) {
      if (primaryMcVersion && primaryNeoVersion) {
        formattedVersion = `Minecraft ${primaryMcVersion} (NeoForge ${primaryNeoVersion})`;
      } else if (primaryMcVersion) {
        formattedVersion = `Minecraft ${primaryMcVersion} (${loader === 'neoforge' ? 'NeoForge' : 'Vanilla'})`;
      } else if (primaryNeoVersion) {
        formattedVersion = `NeoForge ${primaryNeoVersion}`;
      } else {
        formattedVersion = 'Minecraft Servidor';
      }
    }

    return {
      installed: isInstalled,
      serverDir,
      mcVersion: primaryMcVersion || null,
      loader,
      loaderVersion: primaryNeoVersion || null,
      activeVersion,
      versions: versionsWithActive,
      eulaAccepted,
      serverJarFound,
      runScriptFound,
      formattedVersion,
    };
  }

  public async getNeoForgeVersions(mcVersion: string): Promise<string[]> {
    const allVersions = await this.fetchAllNeoForgeVersions();

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
    const detection = this.detectServerFromDisk();
    const serverDir = detection.serverDir;
    const versionInfoPath = path.join(serverDir, 'version-info.json');

    let meta: any = null;
    if (fs.existsSync(versionInfoPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(versionInfoPath, 'utf-8'));
      } catch {}
    }

    const mcVersion = meta?.mcVersion || detection.mcVersion || undefined;
    const loader = (meta?.loader || detection.loader || 'neoforge') as 'neoforge' | 'forge' | 'vanilla' | 'custom';
    const loaderVersion = meta?.loaderVersion || detection.loaderVersion || undefined;

    return {
      installed: detection.installed,
      mcVersion,
      loader,
      loaderVersion,
      javaVersion: meta?.javaVersion || 'Java 21',
      allocatedRamMin: meta?.ramMin || '4G',
      allocatedRamMax: meta?.ramMax || '8G',
      eulaAccepted: detection.eulaAccepted,
      serverJarFound: detection.serverJarFound,
      runScriptFound: detection.runScriptFound,
      serverDir: detection.serverDir,
      formattedVersion: detection.formattedVersion || undefined,
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
    let loaderVer = options.loaderVersion;
    if (!loaderVer || loaderVer === 'latest' || loaderVer.includes('Recomendada')) {
      const builds = await this.getNeoForgeVersions(options.mcVersion);
      if (builds.length > 0) {
        loaderVer = builds[0];
      } else {
        throw new Error(`No se encontró ninguna build de NeoForge disponible para Minecraft ${options.mcVersion}`);
      }
    }
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

  public getLocalNeoForgeVersions(): {
    versions: any[];
    activeVersion: string | null;
    serverDir: string;
    detectedMinecraftVersion: string | null;
  } {
    const detection = this.detectServerFromDisk();
    return {
      versions: detection.versions,
      activeVersion: detection.activeVersion,
      serverDir: detection.serverDir,
      detectedMinecraftVersion: detection.mcVersion,
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
    let version = '';
    const match = originalName.match(/(?:neoforge|forge)-([0-9a-zA-Z._-]+?)(?:-installer)?\.jar/i);
    if (match && match[1]) {
      version = match[1];
    } else {
      throw new Error(`El archivo "${originalName}" no es un instalador o servidor reconocido de NeoForge (ej: neoforge-21.1.65-installer.jar)`);
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

