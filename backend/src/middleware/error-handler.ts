import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors.js';

function isDatabaseConnectivityError(err: Error): boolean {
  const ctor = err.constructor?.name ?? '';
  const msg = (err.message ?? '').toLowerCase();
  if (!ctor.includes('Prisma')) return false;
  return (
    msg.includes('authentication failed') ||
    msg.includes('bad auth') ||
    msg.includes('econnrefused') ||
    msg.includes("can't reach database server") ||
    msg.includes('server selection timed out') ||
    msg.includes('no connection available') ||
    msg.includes('connection closed') ||
    msg.includes('dns resolution') ||
    msg.includes('no record found')
  );
}

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

  console.error('[api]', req.method, req.path, err);

  if (isDatabaseConnectivityError(err)) {
    const msg = (err.message ?? '').toLowerCase();
    const hint =
      msg.includes('dns resolution') || msg.includes('no record found')
        ? ' The cluster hostname in DATABASE_URL is wrong or missing—copy the full URI from Atlas (Connect → Drivers) and fix the part before .mongodb.net.'
        : '';
    res.status(503).json({
      error:
        'Database is unreachable or credentials were rejected. Check DATABASE_URL in .env, Atlas Network Access (IP allowlist), and that the cluster is running.' +
        hint,
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    res.status(500).json({
      error: err.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
    return;
  }

  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
