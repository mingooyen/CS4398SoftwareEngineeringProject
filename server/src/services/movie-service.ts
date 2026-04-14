/**
 * DATABASE ENGINEER — movies, names, posters, admin catalog
 *
 * **Canonical storage** for the app-wide movie list is `MovieCatalogEntry` (see `schema.prisma`
 * for column-level notes, TMDB vs upload vs URL, and indexing suggestions).
 *
 * **API**
 * - `GET /api/v1/movies/catalog` — any authenticated user; returns titles + resolved `posterUrl` when possible.
 * - `POST /api/v1/movies/catalog` — `User.systemRole = SYSTEM_ADMIN` only; inserts a catalog row.
 *
 * **Env you may define**
 * - `TMDB_IMAGE_BASE` — default `https://image.tmdb.org/t/p/w500` (append `posterPath`).
 * - `POSTER_CDN_BASE_URL` — public base for object storage keys in `posterStorageKey` (no trailing slash required; we normalize).
 *
 * Implement TMDB search/detail in `searchTmdb` / `getTmdbDetails` and optionally sync into `MovieCatalogEntry` via jobs or admin UI.
 */
import type { MovieCatalogEntry } from '@prisma/client';
import type { TmdbSearchResult, TmdbMovieDetails } from '../utils/tmdb-client.js';
import type { CreateCatalogMovieBody, MarkWatchedBody } from '../dtos/movie-dtos.js';
import * as movieCatalogRepository from '../repositories/movie-catalog-repository.js';

export interface WatchlistEntry {
  id: string;
  tmdbId: number;
  addedAt: Date;
}

export interface Rating {
  tmdbId: number;
  rating: number;
}

/** Resolved poster for API consumers; null if no poster fields set. */
export function resolveCatalogPosterUrl(entry: MovieCatalogEntry): string | null {
  const cdnBase = process.env.POSTER_CDN_BASE_URL?.replace(/\/$/, '');
  if (entry.posterStorageKey && cdnBase) {
    const key = entry.posterStorageKey.replace(/^\//, '');
    return `${cdnBase}/${key}`;
  }
  if (entry.customPosterUrl) {
    return entry.customPosterUrl;
  }
  const tmdbBase =
    process.env.TMDB_IMAGE_BASE?.replace(/\/$/, '') ?? 'https://image.tmdb.org/t/p/w500';
  if (entry.posterPath) {
    const path = entry.posterPath.startsWith('/') ? entry.posterPath : `/${entry.posterPath}`;
    return `${tmdbBase}${path}`;
  }
  return null;
}

export function catalogEntryToJson(entry: MovieCatalogEntry) {
  return {
    id: entry.id,
    title: entry.title,
    originalTitle: entry.originalTitle,
    releaseYear: entry.releaseYear,
    tmdbId: entry.tmdbId,
    posterPath: entry.posterPath,
    customPosterUrl: entry.customPosterUrl,
    posterStorageKey: entry.posterStorageKey,
    posterUrl: resolveCatalogPosterUrl(entry),
    source: entry.source,
    genre: entry.genre,
    adminNotes: entry.adminNotes,
    synopsis: entry.synopsis,
    addedByUserId: entry.addedByUserId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function listCatalogMovies(): Promise<ReturnType<typeof catalogEntryToJson>[]> {
  return movieCatalogRepository.findManyOrdered().then((rows) => rows.map(catalogEntryToJson));
}

export function createCatalogMovie(
  adminUserId: string,
  dto: CreateCatalogMovieBody
): Promise<ReturnType<typeof catalogEntryToJson>> {
  const source =
    dto.source ?? (dto.tmdbId != null || dto.posterPath != null ? 'TMDB' : 'CUSTOM_ADMIN');

  return movieCatalogRepository
    .create({
      title: dto.title.trim(),
      originalTitle: dto.originalTitle?.trim() || null,
      releaseYear: dto.releaseYear ?? null,
      tmdbId: dto.tmdbId ?? null,
      posterPath: dto.posterPath?.trim() || null,
      customPosterUrl: dto.customPosterUrl ?? null,
      posterStorageKey: dto.posterStorageKey?.trim() || null,
      genre: dto.genre?.trim() || null,
      adminNotes: dto.adminNotes?.trim() || null,
      source,
      synopsis: dto.synopsis?.trim() || null,
      addedByUserId: adminUserId,
    })
    .then(catalogEntryToJson);
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
