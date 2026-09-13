import { Router, Request, Response } from 'express';
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
  });
});

// POST /api/settings
router.post('/', (req: Request, res: Response) => {
  const rootPath = req.body.serverRootPath || req.body.rootPath;
  if (!rootPath || typeof rootPath !== 'string') {
    res.status(400).json({ error: 'Valid rootPath string is required' });
    return;
  }

  const result = configService.setRootPath(rootPath);
  if (!result.success) {
    res.status(400).json({ error: result.message || 'Failed to update root path' });
    return;
  }

  const dirs = configService.validateDirectories();
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

export default router;
