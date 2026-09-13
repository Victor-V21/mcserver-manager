import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
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

// POST /api/mods/upload (single or multiple)
router.post('/upload', upload.array('mods', 20), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const uploadedNames = files ? files.map((f) => f.filename) : [];
    res.json({
      success: true,
      message: `${uploadedNames.length} mod(s) uploaded successfully`,
      files: uploadedNames,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Upload failed' });
  }
});

// PATCH /api/mods/toggle
router.patch('/toggle', (req: Request, res: Response) => {
  const { filename, enable } = req.body;
  if (!filename || typeof enable !== 'boolean') {
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

// POST /api/mods/rename
router.post('/rename', (req: Request, res: Response) => {
  const { oldName, newName } = req.body;
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
});

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

export default router;
