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

export const discoverQuerySchema = z.object({
  genres: z.string().optional(),
  region: z.string().length(2).optional(),
  page: z.coerce.number().int().min(1).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(150).optional(),
  /** TMDB discover `sort_by` (subset we expose for Now Showing–style lists). */
  sortBy: z
    .enum([
      'popularity.desc',
      'vote_average.desc',
      'release_date.desc',
      'revenue.desc',
      'vote_count.desc',
    ])
    .optional(),
  /** TMDB `vote_count.gte` — use with vote_average sort so obscure 1-vote “10★” titles are excluded. */
  voteCountGte: z.coerce.number().int().min(0).max(50000).optional(),
});

export const watchlistBodySchema = z.object({
  tmdbId: z.number().int().positive(),
});

export const markWatchedBodySchema = z.object({
  tmdbId: z.number().int().positive(),
  rating: z.number().min(0).max(10).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
export type WatchlistBody = z.infer<typeof watchlistBodySchema>;
export type MarkWatchedBody = z.infer<typeof markWatchedBodySchema>;
