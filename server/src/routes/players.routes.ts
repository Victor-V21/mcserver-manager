import { Router, Request, Response } from 'express';
import { PlayersService } from '../services/players.service';
import { RconService } from '../services/rcon.service';

const router = Router();
const playersService = PlayersService.getInstance();
const rconService = RconService.getInstance();

// --- OPS ---
router.get('/ops', (_req: Request, res: Response) => {
  try {
    const ops = playersService.getOps();
    res.json(ops);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch ops' });
  }
});

router.post('/ops', async (req: Request, res: Response) => {
  const { name, level } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Player name is required' });
    return;
  }

  try {
    const entry = await playersService.addOp(name, level || 4);
    // If RCON connected, sync in real-time
    try {
      if (rconService.isConnected()) {
        await rconService.sendCommand(`op ${name}`);
      }
    } catch {}

    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add operator' });
  }
});

router.delete('/ops/:uuid', async (req: Request, res: Response) => {
  const { uuid } = req.params;
  try {
    const success = playersService.removeOp(uuid);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove operator' });
  }
});

// --- WHITELIST ---
router.get('/whitelist', (_req: Request, res: Response) => {
  try {
    const list = playersService.getWhitelist();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch whitelist' });
  }
});

router.post('/whitelist/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  try {
    const entry = await playersService.addWhitelist(name);
    try {
      if (rconService.isConnected()) {
        await rconService.sendCommand(`whitelist add ${name}`);
      }
    } catch {}
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add to whitelist' });
  }
});

router.delete('/whitelist/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  try {
    const success = playersService.removeWhitelist(name);
    try {
      if (rconService.isConnected()) {
        await rconService.sendCommand(`whitelist remove ${name}`);
      }
    } catch {}
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove from whitelist' });
  }
});

// --- BANS ---
router.get('/bans', (_req: Request, res: Response) => {
  try {
    const players = playersService.getBannedPlayers();
    const ips = playersService.getBannedIps();
    res.json({ players, ips });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bans' });
  }
});

router.get('/banned', (_req: Request, res: Response) => {
  try {
    const bans = playersService.getBannedPlayers();
    res.json(bans);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bans' });
  }
});

router.delete('/bans/player/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  try {
    const success = playersService.removeBan(name);
    if (rconService.isConnected()) {
      try {
        await rconService.sendCommand(`pardon ${name}`);
      } catch {}
    }
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unban player' });
  }
});

router.delete('/bans/ip/:ip', async (req: Request, res: Response) => {
  const { ip } = req.params;
  try {
    const success = playersService.removeBanIp(ip);
    if (rconService.isConnected()) {
      try {
        await rconService.sendCommand(`pardon-ip ${ip}`);
      } catch {}
    }
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unban IP' });
  }
});

// --- KICK ---
router.post('/kick', async (req: Request, res: Response) => {
  const { name, reason } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Player name is required' });
    return;
  }
  try {
    if (rconService.isConnected()) {
      const cmd = reason ? `kick ${name} ${reason}` : `kick ${name}`;
      await rconService.sendCommand(cmd);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to kick player' });
  }
});

// --- PLAYER QUICK ACTIONS ---
router.post('/action', async (req: Request, res: Response) => {
  const { action, player, reason } = req.body;
  if (!action || !player) {
    res.status(400).json({ error: 'Action and player are required' });
    return;
  }

  try {
    let rconResponse = '';
    const cleanPlayer = player.trim();
    const cleanReason = reason ? ` ${reason.trim()}` : '';

    switch (action) {
      case 'kick': {
        if (rconService.isConnected()) {
          rconResponse = await rconService.sendCommand(`kick ${cleanPlayer}${cleanReason}`);
        }
        break;
      }
      case 'ban': {
        await playersService.addBan(cleanPlayer, reason || 'Banned by operator');
        if (rconService.isConnected()) {
          rconResponse = await rconService.sendCommand(`ban ${cleanPlayer}${cleanReason}`);
        }
        break;
      }
      case 'pardon': {
        playersService.removeBan(cleanPlayer);
        if (rconService.isConnected()) {
          rconResponse = await rconService.sendCommand(`pardon ${cleanPlayer}`);
        }
        break;
      }
      case 'op': {
        await playersService.addOp(cleanPlayer, 4);
        if (rconService.isConnected()) {
          rconResponse = await rconService.sendCommand(`op ${cleanPlayer}`);
        }
        break;
      }
      case 'deop': {
        playersService.removeOp(cleanPlayer);
        if (rconService.isConnected()) {
          rconResponse = await rconService.sendCommand(`deop ${cleanPlayer}`);
        }
        break;
      }
      default:
        res.status(400).json({ error: 'Unsupported action' });
        return;
    }

    res.json({ success: true, action, player, rconResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute player action' });
  }
});

export default router;
