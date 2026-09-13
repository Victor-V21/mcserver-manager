import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../services/config.service';

export interface AuthenticatedRequest extends Request {
  user?: { role: string };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const configService = ConfigService.getInstance();
  const config = configService.getConfig();

  // If initial setup is not yet complete, bypass for setup and me endpoints
  if (!config.initialSetupDone) {
    if (req.path.startsWith('/api/auth/setup') || req.path.startsWith('/api/auth/me')) {
      return next();
    }
    res.status(403).json({ error: 'Initial setup required', setupRequired: true });
    return;
  }

  // Check auth endpoints which are public
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/me')) {
    return next();
  }

  const token = req.cookies?.mc_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { role: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    return;
  }
}
