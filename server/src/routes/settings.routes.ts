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
    fileExplorerRoot: configService.getFileExplorerRoot(),
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
    storageRoot: configService.getRootPath(),
    minecraftAutostart: process.env.MINECRAFT_AUTOSTART !== 'false',
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
    fileExplorerRoot: configService.getFileExplorerRoot(),
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
    storageRoot: configService.getRootPath(),
    minecraftAutostart: process.env.MINECRAFT_AUTOSTART !== 'false',
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
  return configService.getAllowedRoots().map((allowedRoot) => ({
    label: `${allowedRoot} (almacenamiento)`,
    path: allowedRoot,
    exists: fs.existsSync(allowedRoot),
  }));
}

function checkDockerMountStatus(): { isDocker: boolean; storageReady: boolean } {
  const isDocker = fs.existsSync('/.dockerenv') || fs.existsSync('/data');
  return { isDocker, storageReady: fs.existsSync(configService.getFileExplorerRoot()) };
}

// POST /api/settings/browse-dirs
router.post('/browse-dirs', (req: Request, res: Response) => {
  let requestedPath = req.body.path;
  if (!requestedPath || typeof requestedPath !== 'string') {
    const configuredRoot = configService.getRootPath();
    const firstExistingAllowedRoot = configService.getAllowedRoots().find((allowedRoot) => fs.existsSync(allowedRoot));
    if (configService.isPathAllowed(configuredRoot) && fs.existsSync(configuredRoot)) {
      requestedPath = configuredRoot;
    } else if (firstExistingAllowedRoot) {
      requestedPath = firstExistingAllowedRoot;
    } else {
      requestedPath = configService.getAllowedRoots()[0] || '/data';
    }
  }

  const targetPath = path.resolve(requestedPath);
  const { isDocker, storageReady } = checkDockerMountStatus();
  const shortcuts = getSystemShortcuts();

  if (!configService.isPathAllowed(targetPath)) {
    res.status(403).json({
      success: false,
      exists: false,
      currentPath: targetPath,
      directories: [],
      hasMinecraftFiles: false,
      error: 'La ruta está fuera de los volúmenes permitidos del manager.',
      shortcuts,
      isDocker,
      storageReady,
    });
    return;
  }

  if (!fs.existsSync(targetPath)) {
    const parentCandidate = targetPath === '/' ? null : path.dirname(targetPath);
    const parent = parentCandidate && configService.isPathAllowed(parentCandidate) ? parentCandidate : null;
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
      storageReady,
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
    const parentCandidate = targetPath === '/' ? null : path.dirname(targetPath);
    const parentPath = parentCandidate && configService.isPathAllowed(parentCandidate) ? parentCandidate : null;

    res.json({
      success: true,
      exists: true,
      currentPath: targetPath,
      parentPath,
      directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
      hasMinecraftFiles,
      shortcuts,
      isDocker,
      storageReady,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al listar directorio' });
  }
});

export default router;
