import type { Session } from '@prisma/client';
import type { CreateSessionBody, UpdateSessionBody } from '../dtos/session-dtos.js';

export function create(
  groupId: string,
  dto: CreateSessionBody,
  userId: string
): Promise<Session> {
  return Promise.resolve({} as Session); // TODO
}

export function listByGroup(groupId: string): Promise<Session[]> {
  return Promise.resolve([]); // TODO
}

export function getById(
  groupId: string,
  sessionId: string
): Promise<Session | null> {
  return Promise.resolve(null); // TODO
}

export function update(
  groupId: string,
  sessionId: string,
  dto: UpdateSessionBody,
  userId: string
): Promise<Session> {
  return Promise.resolve({} as Session); // TODO
}

export function deleteSession(
  groupId: string,
  sessionId: string,
  userId: string
): Promise<void> {
  return Promise.resolve(); // TODO
}
