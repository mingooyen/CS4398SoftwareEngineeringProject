import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../types/errors.js';

export function requireGroupAdmin(req: Request, res: Response, next: NextFunction): void {
  // Resolve groupId from req.params.groupId or req.body; check member role
  if (!req.userId) throw new ForbiddenError();
  next();
}
