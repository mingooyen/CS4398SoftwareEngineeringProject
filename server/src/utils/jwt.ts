import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserSystemRole } from '@prisma/client';
import { UnauthorizedError } from '../types/errors.js';

export interface AccessJwtPayload {
  sub: string;
  type: 'access';
  systemRole: UserSystemRole;
}

export interface RefreshJwtPayload {
  sub: string;
  type: 'refresh';
  tokenId: string;
}

function getAccessSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'dev-only-insecure-jwt-secret';
  }
  return s;
}

function getRefreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_REFRESH_SECRET is required in production');
    }
    return 'dev-only-insecure-refresh-secret';
  }
  return s;
}

/** Seconds. Override with JWT_ACCESS_EXPIRES_SEC / JWT_REFRESH_EXPIRES_SEC if needed. */
const ACCESS_EXPIRES_SEC = Number(process.env.JWT_ACCESS_EXPIRES_SEC) || 15 * 60;
const REFRESH_EXPIRES_SEC = Number(process.env.JWT_REFRESH_EXPIRES_SEC) || 7 * 24 * 60 * 60;

const accessSignOptions: SignOptions = { expiresIn: ACCESS_EXPIRES_SEC };
const refreshSignOptions: SignOptions = { expiresIn: REFRESH_EXPIRES_SEC };

export function signAccess(userId: string, systemRole: UserSystemRole): string {
  return jwt.sign(
    { sub: userId, type: 'access', systemRole },
    getAccessSecret(),
    accessSignOptions
  );
}

export function signRefresh(userId: string, tokenId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', tokenId },
    getRefreshSecret(),
    refreshSignOptions
  );
}

export function verifyAccess(token: string): AccessJwtPayload {
  try {
    const decoded = jwt.verify(token, getAccessSecret()) as AccessJwtPayload;
    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    if (!decoded.systemRole) {
      decoded.systemRole = 'USER';
    }
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function verifyRefresh(token: string): RefreshJwtPayload {
  try {
    const decoded = jwt.verify(token, getRefreshSecret()) as RefreshJwtPayload;
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
