import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../services/config.service';

const router = Router();
const configService = ConfigService.getInstance();

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const config = configService.getConfig();

  if (!config.initialSetupDone) {
    res.json({
      authenticated: false,
      isAuthenticated: false,
      username: null,
      initialSetupRequired: true,
    });
    return;
  }

  const token = req.cookies?.mc_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.json({
      authenticated: false,
      isAuthenticated: false,
      username: null,
      initialSetupRequired: false,
    });
    return;
  }

  try {
    jwt.verify(token, config.jwtSecret);
    res.json({
      authenticated: true,
      isAuthenticated: true,
      username: 'Admin',
      initialSetupRequired: false,
    });
  } catch {
    res.json({
      authenticated: false,
      isAuthenticated: false,
      username: null,
      initialSetupRequired: false,
    });
  }
});

// POST /api/auth/setup
router.post('/setup', (req: Request, res: Response) => {
  const config = configService.getConfig();
  if (config.initialSetupDone) {
    res.status(400).json({ error: 'Initial setup has already been completed' });
    return;
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters long' });
    return;
  }

  configService.setPassword(password);
  const updatedConfig = configService.getConfig();
  const token = jwt.sign({ role: 'admin' }, updatedConfig.jwtSecret, { expiresIn: '7d' });

  res.cookie('mc_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, token });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const config = configService.getConfig();
  if (!config.initialSetupDone) {
    res.status(400).json({ error: 'Initial setup required' });
    return;
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const matches = bcrypt.compareSync(password, config.passwordHash);
  if (!matches) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '7d' });

  res.cookie('mc_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, token });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('mc_token');
  res.json({ success: true });
});

export default router;
