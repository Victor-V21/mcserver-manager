import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ConfigService } from '../services/config.service';

const router = Router();
const configService = ConfigService.getInstance();

// GET /api/settings
router.get('/', (_req: Request, res: Response) => {
  const config = configService.getConfig();
  const dirs = configService.validateDirectories();

  res.json({
    serverRootPath: config.rootPath,
    rootPath: config.rootPath,
    port: config.port,
    validatedPaths: {
      server: dirs.serverExists,
      mods: dirs.modsExists,
      properties: dirs.propertiesExists,
      logs: dirs.logsExists,
      playit: dirs.playitExists,
      scripts: dirs.scriptsExists,
    },
    directories: dirs,
    autoRestartOnCrash: true,
    rconPort: 25575,
    rconHost: '127.0.0.1',
    maxMemoryAllocated: '8192M',
    aiDiagnosticEnabled: config.aiDiagnosticEnabled,
    aiApiKey: config.aiApiKey,
    aiModel: config.aiModel || 'gemini-3-flash-preview',
  });
});

// POST /api/settings
router.post('/', (req: Request, res: Response) => {
  // Update root path if provided
  const rootPath = req.body.serverRootPath || req.body.rootPath;
  if (rootPath && typeof rootPath === 'string') {
    const result = configService.setRootPath(rootPath);
    if (!result.success) {
      res.status(400).json({ error: result.message || 'Failed to update root path' });
      return;
    }
  }

  // Update AI settings if provided
  if (req.body.aiDiagnosticEnabled !== undefined) {
    configService.setAiSettings(req.body.aiDiagnosticEnabled, req.body.aiApiKey, req.body.aiModel);
  }

  const dirs = configService.validateDirectories();
  const config = configService.getConfig();
  
  const settings = {
    serverRootPath: configService.getRootPath(),
    rootPath: configService.getRootPath(),
    validatedPaths: {
      server: dirs.serverExists,
      mods: dirs.modsExists,
      properties: dirs.propertiesExists,
      logs: dirs.logsExists,
      playit: dirs.playitExists,
      scripts: dirs.scriptsExists,
    },
    directories: dirs,
    autoRestartOnCrash: true,
    rconPort: 25575,
    rconHost: '127.0.0.1',
    maxMemoryAllocated: '8192M',
    aiDiagnosticEnabled: config.aiDiagnosticEnabled,
    aiApiKey: config.aiApiKey,
    aiModel: config.aiModel || 'gemini-3-flash-preview',
  };

  res.json({
    success: true,
    settings,
  });
});

// POST /api/settings/validate-path
router.post('/validate-path', (req: Request, res: Response) => {
  const targetPath = req.body.path;
  if (!targetPath || typeof targetPath !== 'string') {
    res.status(400).json({ error: 'path string is required' });
    return;
  }

  try {
    const dirs = configService.validateDirectories(targetPath);
    res.json({
      exists: dirs.rootExists,
      paths: {
        server: dirs.serverExists,
        mods: dirs.modsExists,
        properties: dirs.propertiesExists,
        logs: dirs.logsExists,
        playit: dirs.playitExists,
        scripts: dirs.scriptsExists,
      },
      directories: dirs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Path validation failed' });
  }
});

const MC_CANDIDATE_FILES = [
  'server',
  'server.jar',
  'mods',
  'server.properties',
  'run.sh',
  'start.sh',
  'run.bat',
  'start.bat',
  'eula.txt',
  'libraries',
  'world',
  'paper.jar',
  'spigot.jar',
  'forge.jar',
  'neoforge.jar',
  'fabric-server-launch.jar',
];

function checkIsMinecraftDir(dirPath: string): boolean {
  try {
    for (const f of MC_CANDIDATE_FILES) {
      if (fs.existsSync(path.join(dirPath, f))) {
        return true;
      }
    }
  } catch {}
  return false;
}

function getSystemShortcuts(): { label: string; path: string; exists: boolean }[] {
  const shortcuts: { label: string; path: string; exists: boolean }[] = [];

  // 1. Host user directories (/home)
  if (fs.existsSync('/home')) {
    shortcuts.push({ label: 'Host (/home)', path: '/home', exists: true });
    try {
      const homeEntries = fs.readdirSync('/home', { withFileTypes: true });
      for (const entry of homeEntries) {
        if (entry.isDirectory()) {
          const userHome = path.join('/home', entry.name);
          shortcuts.push({ label: `/home/${entry.name}`, path: userHome, exists: true });
        }
      }
    } catch {}
  }

  // 2. Alternative host mount paths if mounted as /host or /host/home
  if (fs.existsSync('/host/home')) {
    shortcuts.push({ label: 'Host (/host/home)', path: '/host/home', exists: true });
  } else if (fs.existsSync('/host')) {
    shortcuts.push({ label: 'Host (/host)', path: '/host', exists: true });
  }

  // 3. Docker persistent data directory
  if (fs.existsSync('/data')) {
    shortcuts.push({ label: '/data (Docker)', path: '/data', exists: true });
  }

  // 4. Container app directory
  if (fs.existsSync('/app')) {
    shortcuts.push({ label: '/app', path: '/app', exists: true });
  }

  // 5. Root directory
  shortcuts.push({ label: '/ (Raíz)', path: '/', exists: true });

  return shortcuts;
}

function checkDockerMountStatus(): { isDocker: boolean; isHomeMounted: boolean } {
  const isDocker = fs.existsSync('/.dockerenv') || fs.existsSync('/data');
  let isHomeMounted = false;
  try {
    if (fs.existsSync('/proc/mounts')) {
      const mounts = fs.readFileSync('/proc/mounts', 'utf-8');
      isHomeMounted = mounts.split('\n').some((line) => {
        const parts = line.split(' ');
        const mountPoint = parts[1];
        return (
          mountPoint === '/home' ||
          mountPoint?.startsWith('/home/') ||
          mountPoint === '/host' ||
          mountPoint?.startsWith('/host/')
        );
      });
    }
  } catch {}
  return { isDocker, isHomeMounted };
}

// POST /api/settings/browse-dirs
router.post('/browse-dirs', (req: Request, res: Response) => {
  let requestedPath = req.body.path;
  if (!requestedPath || typeof requestedPath !== 'string') {
    const configuredRoot = configService.getRootPath();
    if (fs.existsSync(configuredRoot)) {
      requestedPath = configuredRoot;
    } else if (fs.existsSync('/home')) {
      requestedPath = '/home';
    } else if (fs.existsSync('/data')) {
      requestedPath = '/data';
    } else {
      requestedPath = '/';
    }
  }

  const targetPath = path.resolve(requestedPath);
  const { isDocker, isHomeMounted } = checkDockerMountStatus();
  const shortcuts = getSystemShortcuts();

  if (!fs.existsSync(targetPath)) {
    const parent = targetPath === '/' ? null : path.dirname(targetPath);
    res.json({
      success: false,
      exists: false,
      currentPath: targetPath,
      parentPath: parent,
      directories: [],
      hasMinecraftFiles: false,
      error: `La ruta "${targetPath}" no existe dentro del contenedor.`,
      shortcuts,
      isDocker,
      isHomeMounted,
    });
    return;
  }

  try {
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      res.status(400).json({ error: 'La ruta especificada no es una carpeta o directorio' });
      return;
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const directories = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullSub = path.join(targetPath, entry.name);
        const isMinecraftCandidate = checkIsMinecraftDir(fullSub);

        directories.push({
          name: entry.name,
          path: fullSub,
          isMinecraftCandidate,
        });
      }
    }

    const hasMinecraftFiles = checkIsMinecraftDir(targetPath);
    const parentPath = targetPath === '/' ? null : path.dirname(targetPath);

    res.json({
      success: true,
      exists: true,
      currentPath: targetPath,
      parentPath,
      directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
      hasMinecraftFiles,
      shortcuts,
      isDocker,
      isHomeMounted,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al listar directorio' });
  }
});

export default router;
