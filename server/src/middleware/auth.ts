import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../types/errors.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) throw new UnauthorizedError();
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // Set req.userId from token if present; do not fail if missing
  next();
}
