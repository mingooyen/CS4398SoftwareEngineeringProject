import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      /** From access token; mirrors User.systemRole in the database. */
      systemRole?: 'USER' | 'SYSTEM_ADMIN';
      refreshTokenId?: string;
      /** Set by group access middleware when :groupId is resolved. */
      group?: import('@prisma/client').Group;
      groupAccess?: GroupAccess;
    }
  }
}

/** Membership or system admin context for the current :groupId route. */
export type GroupAccess =
  | { kind: 'system_admin' }
  | { kind: 'member'; role: Role };

export {};
