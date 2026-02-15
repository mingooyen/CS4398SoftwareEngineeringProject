import type { TmdbSearchResult, TmdbMovieDetails } from '../utils/tmdb-client.js';
import type { MarkWatchedBody } from '../dtos/movie-dtos.js';

export interface WatchlistEntry {
  id: string;
  tmdbId: number;
  addedAt: Date;
}

export interface Rating {
  tmdbId: number;
  rating: number;
}

export function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  return Promise.resolve([]); // TODO
}

export function getTmdbDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return Promise.resolve({} as TmdbMovieDetails); // TODO
}

export function addToWatchlist(userId: string, tmdbId: number): Promise<void> {
  return Promise.resolve(); // TODO
}

export function removeFromWatchlist(userId: string, tmdbId: number): Promise<void> {
  return Promise.resolve(); // TODO
}

export function getWatchlist(userId: string): Promise<WatchlistEntry[]> {
  return Promise.resolve([]); // TODO
}

export function markWatched(userId: string, dto: MarkWatchedBody): Promise<void> {
  return Promise.resolve(); // TODO
}

export function getRatings(userId: string): Promise<Rating[]> {
  return Promise.resolve([]); // TODO
}
