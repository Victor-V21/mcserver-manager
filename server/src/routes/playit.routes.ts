import { Router, Request, Response } from 'express';
import { PlayitService } from '../services/playit.service';

const router = Router();
const playitService = PlayitService.getInstance();

// GET /api/playit/status
router.get('/status', (_req: Request, res: Response) => {
  try {
    const status = playitService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.json({ isRunning: false, pid: null, tunnels: [], logs: [] });
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
