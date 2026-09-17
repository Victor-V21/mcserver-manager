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
    console.error('Error fetching status, returning empty status:', err);
    res.json({
      isRunning: false,
      state: 'offline',
      status: 'offline',
      pid: null,
      uptime: 0,
      version: null,
      cpu: { host: 0, java: 0 },
      hostCpu: 0,
      ram: { used: 0, total: 0, percent: 0, maxAllocated: 0 },
      disk: { used: 0, total: 0, free: 0, percent: 0 },
      tps: { current: null, avgTickMs: null, history: [] },
      players: { online: 0, max: 0, list: [] },
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
        const result = await processService.kill();
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

// POST /api/server/command
router.post('/server/command', (req: Request, res: Response) => {
  const command = req.body?.command;
  if (typeof command !== 'string' || !command.trim()) {
    res.status(400).json({ error: 'Command is required' });
    return;
  }

  const sent = processService.sendCommand(command);
  if (!sent) {
    res.status(409).json({ success: false, error: 'El servidor está detenido o no acepta comandos todavía' });
    return;
  }
  res.json({ success: true, response: 'Comando enviado a la consola del servidor' });
});

// POST /api/status/diagnose-ai
router.post('/diagnose-ai', async (_req: Request, res: Response) => {
  try {
    const result = await processService.triggerAiDiagnostic();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Diagnostic failed' });
  }
});

export default router;
