import { z } from 'zod';

export const updateProfileBodySchema = z.object({
  displayName: z.string().min(1).optional(),
  preferences: z.object({ favoriteGenres: z.array(z.string()) }).optional(),
});

export const preferencesQuerySchema = z.object({});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type PreferencesQuery = z.infer<typeof preferencesQuerySchema>;
