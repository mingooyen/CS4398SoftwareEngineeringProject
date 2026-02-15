import { z } from 'zod';

export const createGroupBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().optional(),
});

export const updateGroupBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export type CreateGroupBody = z.infer<typeof createGroupBodySchema>;
export type UpdateGroupBody = z.infer<typeof updateGroupBodySchema>;
