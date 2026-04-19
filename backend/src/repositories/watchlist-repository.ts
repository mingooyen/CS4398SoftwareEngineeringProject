export interface WatchlistEntry {
  id: string;
  userId: string;
  tmdbId: number;
  addedAt: Date;
}

export function add(userId: string, tmdbId: number): Promise<void> {
  return Promise.resolve(); // TODO
}

export function remove(userId: string, tmdbId: number): Promise<void> {
  return Promise.resolve(); // TODO
}

export function listByUser(userId: string): Promise<WatchlistEntry[]> {
  return Promise.resolve([]); // TODO
}

export function exists(userId: string, tmdbId: number): Promise<boolean> {
  return Promise.resolve(false); // TODO
}
