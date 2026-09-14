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

// POST /api/settings/browse-dirs
router.post('/browse-dirs', (req: Request, res: Response) => {
  let requestedPath = req.body.path;
  if (!requestedPath || typeof requestedPath !== 'string') {
    const configuredRoot = configService.getRootPath();
    if (fs.existsSync(configuredRoot)) {
      requestedPath = configuredRoot;
    } else if (fs.existsSync('/data')) {
      requestedPath = '/data';
    } else {
      requestedPath = '/';
    }
  }

  const targetPath = path.resolve(requestedPath);

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
      shortcuts: [
        { label: '/data (Docker)', path: '/data', exists: fs.existsSync('/data') },
        { label: '/home', path: '/home', exists: fs.existsSync('/home') },
        { label: '/app', path: '/app', exists: fs.existsSync('/app') },
        { label: '/ (Raíz)', path: '/', exists: true },
      ],
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
        let isMinecraftCandidate = false;
        try {
          isMinecraftCandidate =
            fs.existsSync(path.join(fullSub, 'server')) ||
            fs.existsSync(path.join(fullSub, 'server.jar')) ||
            fs.existsSync(path.join(fullSub, 'mods')) ||
            fs.existsSync(path.join(fullSub, 'server.properties'));
        } catch {}

        directories.push({
          name: entry.name,
          path: fullSub,
          isMinecraftCandidate,
        });
      }
    }

    const hasMinecraftFiles =
      fs.existsSync(path.join(targetPath, 'server')) ||
      fs.existsSync(path.join(targetPath, 'server.jar')) ||
      fs.existsSync(path.join(targetPath, 'mods')) ||
      fs.existsSync(path.join(targetPath, 'server.properties'));

    const parentPath = targetPath === '/' ? null : path.dirname(targetPath);

    res.json({
      success: true,
      exists: true,
      currentPath: targetPath,
      parentPath,
      directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
      hasMinecraftFiles,
      shortcuts: [
        { label: '/data (Docker)', path: '/data', exists: fs.existsSync('/data') },
        { label: '/home', path: '/home', exists: fs.existsSync('/home') },
        { label: '/app', path: '/app', exists: fs.existsSync('/app') },
        { label: '/ (Raíz)', path: '/', exists: true },
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al listar directorio' });
  }
});

export default router;
