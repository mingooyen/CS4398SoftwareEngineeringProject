export interface Vote {
  id: string;
  sessionId: string;
  userId: string;
  movieTmdbId: number;
  createdAt: Date;
  updatedAt: Date;
}

export function upsert(
  sessionId: string,
  userId: string,
  movieTmdbId: number
): Promise<Vote> {
  return Promise.resolve({} as Vote); // TODO
}

export function findBySession(sessionId: string): Promise<Vote[]> {
  return Promise.resolve([]); // TODO
}

export function findBySessionAndUser(
  sessionId: string,
  userId: string
): Promise<Vote | null> {
  return Promise.resolve(null); // TODO
}
