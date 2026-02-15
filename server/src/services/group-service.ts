import type { Group } from '@prisma/client';
import type { CreateGroupBody, UpdateGroupBody } from '../dtos/group-dtos.js';

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: string;
  joinedAt: Date;
}

export type Role = 'MEMBER' | 'ADMIN';

export function create(userId: string, dto: CreateGroupBody): Promise<Group> {
  return Promise.resolve({} as Group); // TODO
}

export function findForUser(userId: string): Promise<Group[]> {
  return Promise.resolve([]); // TODO
}

export function getById(groupId: string): Promise<Group | null> {
  return Promise.resolve(null); // TODO
}

export function update(
  groupId: string,
  dto: UpdateGroupBody,
  actorId: string
): Promise<Group> {
  return Promise.resolve({} as Group); // TODO
}

export function deleteGroup(groupId: string, actorId: string): Promise<void> {
  return Promise.resolve(); // TODO
}

export function join(groupId: string, userId: string): Promise<void> {
  return Promise.resolve(); // TODO
}

export function leave(groupId: string, userId: string): Promise<void> {
  return Promise.resolve(); // TODO
}

export function getMembers(groupId: string): Promise<GroupMember[]> {
  return Promise.resolve([]); // TODO
}

export function getMemberRole(
  groupId: string,
  userId: string
): Promise<Role | null> {
  return Promise.resolve(null); // TODO
}
