import { z } from 'zod';

export const createSessionBodySchema = z.object({
  scheduledAt: z.string().datetime(),
  movieTmdbId: z.number().int().positive().optional(),
});

export const updateSessionBodySchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  movieTmdbId: z.number().int().positive().optional().nullable(),
});

export type CreateSessionBody = z.infer<typeof createSessionBodySchema>;
export type UpdateSessionBody = z.infer<typeof updateSessionBodySchema>;
