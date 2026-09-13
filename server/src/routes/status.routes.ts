import { Router, Request, Response } from 'express';
import { MonitorService } from '../services/monitor.service';
import { ProcessService } from '../services/process.service';

const router = Router();
const monitorService = MonitorService.getInstance();
const processService = ProcessService.getInstance();

// GET /api/status
router.get('/', async (_req: Request, res: Response) => {
  try {
    const status = await monitorService.getStatus();
    res.json(status);
  } catch (err: any) {
    console.error('Error fetching status, returning safe fallback:', err);
    res.json({
      isRunning: false,
      state: 'offline',
      status: 'offline',
      pid: null,
      uptime: 0,
      version: 'NeoForge',
      cpu: { host: 0, java: 0 },
      hostCpu: 0,
      ram: { used: 0, total: 8192, percent: 0, maxAllocated: 8192 },
      disk: { used: 0, total: 50, free: 50, percent: 0 },
      tps: { current: 0, history: [0, 0, 0, 0, 0] },
      players: { online: 0, max: 20, list: [] },
    });
  }
});

// POST /api/server/action
router.post('/server/action', async (req: Request, res: Response) => {
  const { action } = req.body;

  try {
    switch (action) {
      case 'start': {
        const result = await processService.start();
        res.json(result);
        break;
      }
      case 'stop': {
        const result = await processService.stop();
        res.json(result);
        break;
      }
      case 'restart': {
        const result = await processService.restart();
        res.json(result);
        break;
      }
      case 'kill': {
        const result = processService.kill();
        res.json(result);
        break;
      }
      default:
        res.status(400).json({ error: 'Invalid action. Must be start, stop, restart, or kill.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Action failed' });
  }
});

export default router;
