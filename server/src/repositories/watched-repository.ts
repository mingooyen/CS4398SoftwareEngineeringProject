export interface WatchedEntry {
  id: string;
  userId: string;
  tmdbId: number;
  rating: number | null;
  watchedAt: Date;
}

export function upsert(
  userId: string,
  tmdbId: number,
  rating?: number
): Promise<void> {
  return Promise.resolve(); // TODO
}

export function listByUser(userId: string): Promise<WatchedEntry[]> {
  return Promise.resolve([]); // TODO
}

export function getRating(userId: string, tmdbId: number): Promise<number | null> {
  return Promise.resolve(null); // TODO
}
