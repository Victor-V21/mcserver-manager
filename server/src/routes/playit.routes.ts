import { Router, Request, Response } from 'express';
import { PlayitService } from '../services/playit.service';

const router = Router();
const playitService = PlayitService.getInstance();

// GET /api/playit/config
router.get('/config', (_req: Request, res: Response) => {
  res.json(playitService.getConfig());
});

// PUT /api/playit/config
router.put('/config', (req: Request, res: Response) => {
  try {
    res.json(playitService.saveConfig(req.body || {}));
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'No se pudo guardar la configuración de Playit' });
  }
});

// POST /api/playit/link
router.post('/link', async (req: Request, res: Response) => {
  const secret = typeof req.body?.secret === 'string' ? req.body.secret : '';
  if (!secret.trim()) {
    res.status(400).json({ error: 'Debes proporcionar la clave de vinculación de Playit' });
    return;
  }

  try {
    res.json(await playitService.provisionSecret(secret));
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'No se pudo vincular el agente de Playit' });
  }
});

// GET /api/playit/status
router.get('/status', (_req: Request, res: Response) => {
  try {
    const status = playitService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.json({ isRunning: false, pid: null, tunnels: [], logs: [], lastError: err?.message || 'No se pudo leer Playit' });
  }
});

// POST /api/playit/action
router.post('/action', async (req: Request, res: Response) => {
  const { action } = req.body;

  try {
    switch (action) {
      case 'start': {
        const result = await playitService.start();
        res.json(result);
        break;
      }
      case 'stop': {
        const result = playitService.stop();
        res.json(result);
        break;
      }
      case 'restart': {
        const result = await playitService.restart();
        res.json(result);
        break;
      }
      default:
        res.status(400).json({ error: 'Invalid action. Must be start, stop, or restart.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Playit action failed' });
  }
});

export default router;
