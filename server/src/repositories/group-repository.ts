import type { Group } from '@prisma/client';

export interface CreateGroupData {
  name: string;
  slug: string;
  description?: string;
  createdById: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
}

export function create(data: CreateGroupData): Promise<Group> {
  return Promise.resolve({} as Group); // TODO
}

export function findManyByMember(userId: string): Promise<Group[]> {
  return Promise.resolve([]); // TODO
}

export function findById(id: string): Promise<Group | null> {
  return Promise.resolve(null); // TODO
}

export function update(id: string, data: UpdateGroupData): Promise<Group> {
  return Promise.resolve({} as Group); // TODO
}

export function deleteGroup(id: string): Promise<void> {
  return Promise.resolve(); // TODO
}
