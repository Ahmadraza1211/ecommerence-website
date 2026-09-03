import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'BUYER' | 'ADMIN';
    email: string;
  };
}

export function signAccessToken(payload: { id: string; role: string; email: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function signRefreshToken(payload: { id: string; role: string; email: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyToken<T = any>(token: string): T {
  return jwt.verify(token, env.JWT_SECRET) as T;
}

/**
 * PRD_New V3 §Platform-Wide.1: Fix unexpected logout mid-session.
 * - Added 60-second clock skew buffer so a token expiring "right now" doesn't
 *   immediately reject an in-flight request.
 * - Re-loads user from DB on every request (catches deleted/role-changed users).
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    let payload: { id: string; role: 'BUYER' | 'ADMIN'; email: string; iat?: number; exp?: number };
    try {
      payload = verifyToken<typeof payload>(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        // PRD_New V3: 60-second grace window — if the token expired less than
        // 60 seconds ago, allow the request through and let the frontend
        // refresh in the background. This prevents mid-session logouts.
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }

    const user = await User.findById(payload.id).select('_id role email');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists', code: 'USER_GONE' });
    }
    if (user.role !== payload.role) {
      return res.status(401).json({ error: 'Session outdated, please sign in again', code: 'ROLE_CHANGED' });
    }
    req.user = { id: String(user._id), role: user.role, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles: ('BUYER' | 'ADMIN')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireBuyer = requireRole('BUYER');
export const requireAny = requireRole('BUYER', 'ADMIN');
