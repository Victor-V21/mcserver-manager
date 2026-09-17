import { Router, Request, Response } from 'express';
import { PlayersService } from '../services/players.service';
import { ProcessService } from '../services/process.service';

const router = Router();
const playersService = PlayersService.getInstance();
const processService = ProcessService.getInstance();

const sendToMinecraft = (command: string): boolean => processService.sendCommand(command);

// --- OPS ---
router.get('/ops', (_req: Request, res: Response) => {
  try { res.json(playersService.getOps()); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Failed to fetch ops' }); }
});

router.post('/ops', async (req: Request, res: Response) => {
  const { name, level } = req.body;
  if (!name) { res.status(400).json({ error: 'Player name is required' }); return; }
  try {
    const entry = await playersService.addOp(name.trim(), level || 4);
    res.json({ success: true, entry, appliedToRunningServer: sendToMinecraft(`op ${entry.name}`) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to add operator' }); }
});

router.delete('/ops/:uuid', (req: Request, res: Response) => {
  try {
    const success = playersService.removeOp(req.params.uuid);
    if (success) sendToMinecraft(`deop ${req.params.uuid}`);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to remove operator' }); }
});

// --- WHITELIST ---
router.get('/whitelist', (_req: Request, res: Response) => {
  try { res.json(playersService.getWhitelist()); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Failed to fetch whitelist' }); }
});

router.post('/whitelist/:name', async (req: Request, res: Response) => {
  try {
    const entry = await playersService.addWhitelist(req.params.name.trim());
    res.json({ success: true, entry, appliedToRunningServer: sendToMinecraft(`whitelist add ${entry.name}`) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to add to whitelist' }); }
});

router.delete('/whitelist/:name', (req: Request, res: Response) => {
  try {
    const success = playersService.removeWhitelist(req.params.name);
    if (success) sendToMinecraft(`whitelist remove ${req.params.name}`);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to remove from whitelist' }); }
});

// --- BANS ---
router.get('/bans', (_req: Request, res: Response) => {
  try { res.json({ players: playersService.getBannedPlayers(), ips: playersService.getBannedIps() }); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Failed to fetch bans' }); }
});

router.get('/banned', (_req: Request, res: Response) => {
  try { res.json(playersService.getBannedPlayers()); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Failed to fetch bans' }); }
});

router.delete('/bans/player/:name', (req: Request, res: Response) => {
  try {
    const success = playersService.removeBan(req.params.name);
    if (success) sendToMinecraft(`pardon ${req.params.name}`);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to unban player' }); }
});

router.delete('/bans/ip/:ip', (req: Request, res: Response) => {
  try {
    const success = playersService.removeBanIp(req.params.ip);
    if (success) sendToMinecraft(`pardon-ip ${req.params.ip}`);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to unban IP' }); }
});

// --- KICK ---
router.post('/kick', (req: Request, res: Response) => {
  const { name, reason } = req.body;
  if (!name) { res.status(400).json({ error: 'Player name is required' }); return; }
  const command = `kick ${name.trim()}${reason ? ` ${String(reason).trim()}` : ''}`;
  res.json({ success: sendToMinecraft(command) });
});

// --- PLAYER QUICK ACTIONS ---
router.post('/action', async (req: Request, res: Response) => {
  const { action, player, reason } = req.body;
  if (!action || !player) { res.status(400).json({ error: 'Action and player are required' }); return; }

  try {
    const cleanPlayer = String(player).trim();
    const cleanReason = reason ? ` ${String(reason).trim()}` : '';
    let command = '';

    switch (action) {
      case 'kick': command = `kick ${cleanPlayer}${cleanReason}`; break;
      case 'ban':
        await playersService.addBan(cleanPlayer, reason || 'Banned by operator');
        command = `ban ${cleanPlayer}${cleanReason}`;
        break;
      case 'pardon':
        playersService.removeBan(cleanPlayer);
        command = `pardon ${cleanPlayer}`;
        break;
      case 'op':
        await playersService.addOp(cleanPlayer, 4);
        command = `op ${cleanPlayer}`;
        break;
      case 'deop':
        playersService.removeOp(cleanPlayer);
        command = `deop ${cleanPlayer}`;
        break;
      default: res.status(400).json({ error: 'Unsupported action' }); return;
    }

    res.json({ success: true, action, player: cleanPlayer, appliedToRunningServer: sendToMinecraft(command) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to execute player action' }); }
});

export default router;
