import type { Session } from '@prisma/client';

export interface CreateSessionData {
  groupId: string;
  scheduledAt: Date;
  movieTmdbId?: number | null;
  createdById: string;
}

export interface UpdateSessionData {
  scheduledAt?: Date;
  movieTmdbId?: number | null;
}

export function create(data: CreateSessionData): Promise<Session> {
  return Promise.resolve({} as Session); // TODO
}

export function findByGroup(groupId: string): Promise<Session[]> {
  return Promise.resolve([]); // TODO
}

export function findById(groupId: string, sessionId: string): Promise<Session | null> {
  return Promise.resolve(null); // TODO
}

export function update(sessionId: string, data: UpdateSessionData): Promise<Session> {
  return Promise.resolve({} as Session); // TODO
}

export function deleteSession(sessionId: string): Promise<void> {
  return Promise.resolve(); // TODO
}
