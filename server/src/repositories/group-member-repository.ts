import type { GroupMember } from '@prisma/client';
import type { Role } from '@prisma/client';
import { getPrisma } from '../config/database.js';

export type { Role };

export function add(
  groupId: string,
  userId: string,
  role: Role
): Promise<GroupMember> {
  return getPrisma().groupMember.create({
    data: { groupId, userId, role },
  });
}

export function remove(groupId: string, userId: string): Promise<void> {
  return getPrisma()
    .groupMember.deleteMany({ where: { groupId, userId } })
    .then(() => undefined);
}

export function findByGroup(groupId: string): Promise<GroupMember[]> {
  return getPrisma().groupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: 'asc' },
  });
}

export function getRole(groupId: string, userId: string): Promise<Role | null> {
  return getPrisma()
    .groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    })
    .then((m) => m?.role ?? null);
}

export function countAdmins(groupId: string): Promise<number> {
  return getPrisma().groupMember.count({
    where: { groupId, role: 'ADMIN' },
  });
}
