import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../types/errors.js';
import { verifyAccess } from '../utils/jwt.js';

/**
 * Reads `Authorization: Bearer <access>` and sets req.userId + req.systemRole.
 * Does not fail if the header is missing (chain with requireAuth to enforce).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const payload = verifyAccess(header.slice(7));
    req.userId = payload.sub;
    req.systemRole = payload.systemRole;
  } catch {
    // Leave user unset; requireAuth will reject if needed
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) throw new UnauthorizedError();
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  authenticate(req, _res, next);
}
