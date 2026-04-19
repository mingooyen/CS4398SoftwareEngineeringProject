import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const appErr = err as AppError;
    res.status(appErr.statusCode).json({ error: appErr.message, code: appErr.code });
    return;
  }
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
