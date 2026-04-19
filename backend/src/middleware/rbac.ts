import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../types/errors.js';

/** Platform admin only (e.g. add rows to `MovieCatalogEntry`, manage global catalog). */
export function requireSystemAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) throw new ForbiddenError();
  if (req.systemRole !== 'SYSTEM_ADMIN') {
    throw new ForbiddenError('System admin access required.');
  }
  next();
}

/**
 * Group settings / destructive actions: allowed for **system admins** (all groups) or the group's
 * **ADMIN** member role (this group's admins only).
 */
export function requireGroupAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) throw new ForbiddenError();

  const access = req.groupAccess;
  if (!access) throw new ForbiddenError();

  if (access.kind === 'system_admin') {
    next();
    return;
  }

  if (access.kind === 'member' && access.role === 'ADMIN') {
    next();
    return;
  }

  throw new ForbiddenError('Group admin or system admin access required.');
}
