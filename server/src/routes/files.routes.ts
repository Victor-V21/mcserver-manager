import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { FilesService } from '../services/files.service';

const router = Router();
const filesService = FilesService.getInstance();

// Configure multer for file uploads in explorer
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const targetRel = (req.query.path as string) || (req.body.targetPath as string) || '';
      try {
        const dest = filesService.resolvePath(targetRel);
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        if (!fs.statSync(dest).isDirectory()) {
          cb(new Error('Upload destination is not a directory'), '');
          return;
        }
        cb(null, dest);
      } catch (error: any) {
        cb(error, '');
      }
    },
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB max
});

// GET /api/files?path=...
router.get('/', (req: Request, res: Response) => {
  const targetPath = (req.query.path as string) || '';
  try {
    const result = filesService.listFiles(targetPath);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to list directory' });
  }
});

// GET /api/files/content?path=...
router.get('/content', (req: Request, res: Response) => {
  const targetPath = (req.query.path as string) || '';
  if (!targetPath) {
    res.status(400).json({ error: 'path query parameter is required' });
    return;
  }

  try {
    const content = filesService.getFileContent(targetPath);
    res.json({ path: targetPath, content });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to read file' });
  }
});

// PUT /api/files/content
router.put('/content', (req: Request, res: Response) => {
  const { path: targetPath, content } = req.body;
  if (!targetPath || typeof content !== 'string') {
    res.status(400).json({ error: 'path and content string are required' });
    return;
  }

  try {
    filesService.saveFileContent(targetPath, content);
    res.json({ success: true, message: 'File saved successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save file' });
  }
});

// POST /api/files/upload
router.post('/upload', upload.array('files', 20), (req: Request, res: Response) => {
  try {
    const uploaded = (req.files as Express.Multer.File[]) || [];
    res.json({
      success: true,
      message: `${uploaded.length} file(s) uploaded successfully`,
      files: uploaded.map((f) => f.filename),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Upload failed' });
  }
});

// POST /api/files/mkdir
router.post('/mkdir', (req: Request, res: Response) => {
  const { path: targetPath, name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Directory name is required' });
    return;
  }

  try {
    const createdPath = filesService.createDirectory(targetPath || '', name);
    res.json({ success: true, path: createdPath });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create directory' });
  }
});

// POST /api/files/rename
router.post('/rename', (req: Request, res: Response) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) {
    res.status(400).json({ error: 'oldPath and newName are required' });
    return;
  }

  try {
    filesService.renameItem(oldPath, newName);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to rename item' });
  }
});

// DELETE /api/files?path=...
router.delete('/', (req: Request, res: Response) => {
  const targetPath = (req.query.path as string) || (req.body.path as string);
  if (!targetPath) {
    res.status(400).json({ error: 'path is required' });
    return;
  }

  try {
    filesService.deleteItem(targetPath);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete item' });
  }
});

export default router;
