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

export const inviteCandidatesQuerySchema = z.object({
  q: z.string().optional().default(''),
});

export const createGroupInviteBodySchema = z.object({
  inviteeUserId: z.string().min(1),
});

export type CreateGroupBody = z.infer<typeof createGroupBodySchema>;
export type UpdateGroupBody = z.infer<typeof updateGroupBodySchema>;
export type InviteCandidatesQuery = z.infer<typeof inviteCandidatesQuerySchema>;
export type CreateGroupInviteBody = z.infer<typeof createGroupInviteBodySchema>;
