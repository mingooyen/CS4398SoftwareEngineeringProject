import { z } from 'zod';

/** Admin-only create body for `MovieCatalogEntry` (global list). See Prisma model docs for poster fields. */
export const createCatalogMovieBodySchema = z.object({
  title: z.string().min(1),
  originalTitle: z.string().optional(),
  releaseYear: z.number().int().min(1888).max(2100).optional(),
  tmdbId: z.number().int().positive().optional(),
  posterPath: z.string().optional(),
  customPosterUrl: z.string().url().optional(),
  posterStorageKey: z.string().min(1).optional(),
  genre: z.string().min(1).optional(),
  adminNotes: z.string().optional(),
  source: z.enum(['TMDB', 'CUSTOM_ADMIN']).optional(),
  synopsis: z.string().optional(),
});

export type CreateCatalogMovieBody = z.infer<typeof createCatalogMovieBodySchema>;

export const searchQuerySchema = z.object({
  q: z.string().min(1),
});

export const watchlistBodySchema = z.object({
  tmdbId: z.number().int().positive(),
});

export const markWatchedBodySchema = z.object({
  tmdbId: z.number().int().positive(),
  rating: z.number().min(0).max(10).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type WatchlistBody = z.infer<typeof watchlistBodySchema>;
export type MarkWatchedBody = z.infer<typeof markWatchedBodySchema>;
