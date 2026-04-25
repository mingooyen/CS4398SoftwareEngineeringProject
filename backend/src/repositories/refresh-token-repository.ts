import type { RefreshToken } from '@prisma/client';

export function create(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<RefreshToken> {
  return Promise.resolve({} as RefreshToken); // TODO
}

export function findByToken(token: string): Promise<RefreshToken | null> {
  return Promise.resolve(null); // TODO
}

export function revoke(id: string): Promise<void> {
  return Promise.resolve(); // TODO
}

export function revokeAllForUser(userId: string): Promise<void> {
  return Promise.resolve(); // TODO
}
