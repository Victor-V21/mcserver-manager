import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { VersionsService } from '../services/versions.service';
import { ConfigService } from '../services/config.service';
import { SUBDIRS } from '../config/constants';

const router = Router();
const versionsService = VersionsService.getInstance();

// GET /api/versions/manifest
router.get('/manifest', async (req: Request, res: Response) => {
  const mcVersion = (req.query.mcVersion as string) || '1.21.1';

  try {
    const [manifest, neoforgeVersions] = await Promise.all([
      versionsService.getMinecraftManifest(),
      versionsService.getNeoForgeVersions(mcVersion),
    ]);

    const releasesOnly = manifest.versions
      .filter((v) => v.type === 'release')
      .map((v) => v.id);

    res.json({
      minecraftVersions: releasesOnly,
      neoforgeVersions,
      latestMinecraft: manifest.latest.release,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch version manifest' });
  }
});

// GET /api/versions/minecraft
router.get('/minecraft', async (_req: Request, res: Response) => {
  try {
    const manifest = await versionsService.getMinecraftManifest();
    const releases = manifest.versions.filter((v) => v.type === 'release');
    res.json(releases);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch Minecraft versions' });
  }
});

// GET /api/versions/loaders?type=neoforge&mcVersion=1.21.1
router.get('/loaders', async (req: Request, res: Response) => {
  const mcVersion = (req.query.mcVersion as string) || '1.21.1';

  try {
    const rawVersions = await versionsService.getNeoForgeVersions(mcVersion);
    const result = rawVersions.map((ver, idx) => ({
      version: ver,
      mcVersion,
      isRecommended: idx === 0, // Top/first is the latest recommended build
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch loader builds' });
  }
});

// GET /api/versions/current and /api/versions/installed
const getCurrentHandler = (_req: Request, res: Response) => {
  try {
    const current = versionsService.getInstalledVersion();
    res.json({
      isInstalled: current.installed,
      serverType: current.loader || 'neoforge',
      mcVersion: current.mcVersion || null,
      loaderVersion: current.loaderVersion || null,
      javaVersion: current.javaVersion || null,
      jarFile: current.serverJarFound ? 'server.jar' : null,
      eulaAccepted: current.eulaAccepted,
      allocatedRamMin: current.allocatedRamMin,
      allocatedRamMax: current.allocatedRamMax,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get current version info' });
  }
};

router.get('/current', getCurrentHandler);
router.get('/installed', getCurrentHandler);

// POST /api/versions/install
router.post('/install', async (req: Request, res: Response) => {
  const {
    mcVersion,
    loader,
    serverType,
    loaderVersion,
    javaVersion,
    ramMin,
    ramInitial,
    ramMax,
    acceptEula,
  } = req.body;

  const targetMcVersion = mcVersion;
  const targetLoader = (serverType || loader || 'neoforge') as 'neoforge' | 'vanilla';
  const targetRamMin = ramMin || ramInitial || '4G';
  const targetRamMax = ramMax || '8G';

  if (!targetMcVersion) {
    res.status(400).json({ error: 'mcVersion is required' });
    return;
  }

  try {
    // If loaderVersion is empty or default, find the latest build for this mcVersion
    let chosenLoaderVersion = loaderVersion;
    if (targetLoader === 'neoforge' && (!chosenLoaderVersion || chosenLoaderVersion.includes('Recomendada'))) {
      const builds = await versionsService.getNeoForgeVersions(targetMcVersion);
      if (builds.length > 0) {
        chosenLoaderVersion = builds[0];
      }
    }

    // Start installation asynchronously in background
    versionsService
      .installVersion({
        mcVersion: targetMcVersion,
        loader: targetLoader,
        loaderVersion: chosenLoaderVersion,
        javaVersion,
        ramMin: targetRamMin,
        ramMax: targetRamMax,
        acceptEula: Boolean(acceptEula),
      })
      .catch((err) => {
        console.error('Background installation error:', err);
      });

    res.json({
      success: true,
      message: `Instalación de Minecraft ${targetMcVersion} (${targetLoader} ${chosenLoaderVersion || ''}) iniciada. Progreso en consola.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to initiate installation' });
  }
});

// GET /api/versions/neoforge/local
router.get('/neoforge/local', (_req: Request, res: Response) => {
  try {
    const result = versionsService.getLocalNeoForgeVersions();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get local NeoForge versions' });
  }
});

// POST /api/versions/neoforge/active
router.post('/neoforge/active', (req: Request, res: Response) => {
  const { version } = req.body;
  if (!version) {
    res.status(400).json({ error: 'version string is required' });
    return;
  }

  try {
    const result = versionsService.setActiveNeoForgeVersion(version);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to set active NeoForge version' });
  }
});

// Multer storage for NeoForge Jar upload
const jarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const serverDir = ConfigService.getInstance().resolvePath(SUBDIRS.SERVER);
      if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
      cb(null, serverDir);
    },
    filename: (_req, file, cb) => {
      const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, safeName);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// POST /api/versions/neoforge/upload
router.post('/neoforge/upload', jarUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No .jar file uploaded' });
    return;
  }

  try {
    const result = await versionsService.installLocalJar(req.file.path, req.file.originalname);
    res.json({
      success: true,
      message: `Archivo NeoForge subido y registrado como activo (Versión: ${result.version})`,
      version: result.version,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process NeoForge jar' });
  }
});

export default router;
