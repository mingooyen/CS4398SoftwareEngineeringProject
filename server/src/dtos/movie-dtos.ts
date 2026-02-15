import { z } from 'zod';

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
