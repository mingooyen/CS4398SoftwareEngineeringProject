import type { GroupMember } from '@prisma/client';

export type Role = 'MEMBER' | 'ADMIN';

export function add(
  groupId: string,
  userId: string,
  role: Role
): Promise<GroupMember> {
  return Promise.resolve({} as GroupMember); // TODO
}

export function remove(groupId: string, userId: string): Promise<void> {
  return Promise.resolve(); // TODO
}

export function findByGroup(groupId: string): Promise<GroupMember[]> {
  return Promise.resolve([]); // TODO
}

export function getRole(groupId: string, userId: string): Promise<Role | null> {
  return Promise.resolve(null); // TODO
}
