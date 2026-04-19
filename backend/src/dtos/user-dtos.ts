import { z } from 'zod';

export const updateProfileBodySchema = z.object({
  displayName: z.string().min(1).optional(),
  preferences: z.object({ favoriteGenres: z.array(z.string()) }).optional(),
});

export const preferencesQuerySchema = z.object({});

export const searchUsersQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const createFriendRequestBodySchema = z.object({
  targetUserId: z.string().min(1),
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type PreferencesQuery = z.infer<typeof preferencesQuerySchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
export type CreateFriendRequestBody = z.infer<typeof createFriendRequestBodySchema>;
