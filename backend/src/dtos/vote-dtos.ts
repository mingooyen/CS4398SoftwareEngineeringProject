import { z } from 'zod';

export const castVoteBodySchema = z.object({
  movieTmdbId: z.number().int().positive(),
});

export type CastVoteBody = z.infer<typeof castVoteBodySchema>;
