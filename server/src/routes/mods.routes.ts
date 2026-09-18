import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import archiver from 'archiver';
import { ModsService } from '../services/mods.service';

const router = Router();
const modsService = ModsService.getInstance();

// Configure multer storage directly to server/mods
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, modsService.getModsDir());
  },
  filename: (_req, file, cb) => {
    // Sanitize filename
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.jar') || file.originalname.endsWith('.jar.disabled')) {
      cb(null, true);
    } else {
      cb(new Error('Only .jar or .jar.disabled files are allowed'));
    }
  },
});

// GET /api/mods
router.get('/', (_req: Request, res: Response) => {
  try {
    const mods = modsService.listMods();
    res.json(mods);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list mods' });
  }
});

// GET /api/mods/download-enabled
router.get('/download-enabled', (_req: Request, res: Response) => {
  try {
    const enabledMods = modsService.listEnabledModFiles();
    if (enabledMods.length === 0) {
      res.status(404).json({ error: 'No hay mods habilitados para descargar' });
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const archiveName = `minecraft-mods-enabled-${date}.zip`;
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.status(200);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
    res.setHeader('Cache-Control', 'no-store');

    archive.on('error', (error) => {
      console.error('[Mods] Error creando descarga de mods:', error);
      if (!res.headersSent) res.status(500).json({ error: 'No se pudo crear el archivo de mods' });
      else res.destroy(error);
    });
    res.on('close', () => {
      if (!res.writableFinished) archive.abort();
    });

    archive.pipe(res);
    for (const mod of enabledMods) {
      archive.file(mod.fullPath, { name: mod.filename });
    }
    void archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'No se pudo preparar la descarga de mods' });
  }
});

// POST /api/mods/upload (single or multiple, supports any field name e.g. 'file' or 'mods')
router.post('/upload', (req: Request, res: Response) => {
  upload.any()(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir mod(s)' });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const uploadedNames = files.map((f) => f.filename);

    return res.json({
      success: true,
      message: `${uploadedNames.length} mod(s) subido(s) exitosamente`,
      files: uploadedNames,
      filename: uploadedNames[0] || '',
    });
  });
});

// PATCH /api/mods/toggle
router.patch('/toggle', (req: Request, res: Response) => {
  const filename = req.body.filename || req.body.name;
  const enable = typeof req.body.enable === 'boolean' ? req.body.enable : undefined;
  if (!filename || enable === undefined) {
    res.status(400).json({ error: 'filename and enable (boolean) are required' });
    return;
  }

  try {
    const result = modsService.toggleMod(filename, enable);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Toggle failed' });
  }
});

// POST /api/mods/rename and PATCH /api/mods/rename
const renameHandler = (req: Request, res: Response) => {
  const oldName = req.body.oldName || req.body.oldFilename || req.body.filename;
  const newName = req.body.newName || req.body.newFilename;
  if (!oldName || !newName) {
    res.status(400).json({ error: 'oldName and newName are required' });
    return;
  }

  try {
    const result = modsService.renameMod(oldName, newName);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Rename failed' });
  }
};

router.post('/rename', renameHandler);
router.patch('/rename', renameHandler);

// DELETE /api/mods/:filename
router.delete('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  try {
    const success = modsService.deleteMod(filename);
    if (!success) {
      res.status(404).json({ error: 'Mod file not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Delete failed' });
  }
});

// POST /api/mods/disable-all
router.post('/disable-all', (_req: Request, res: Response) => {
  try {
    const result = modsService.disableAllMods();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al desactivar todos los mods' });
  }
});

// POST /api/mods/delete-all & DELETE /api/mods/all
const deleteAllHandler = (_req: Request, res: Response) => {
  try {
    const result = modsService.deleteAllMods();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar todos los mods' });
  }
};
router.post('/delete-all', deleteAllHandler);
router.delete('/all', deleteAllHandler);

export default router;
