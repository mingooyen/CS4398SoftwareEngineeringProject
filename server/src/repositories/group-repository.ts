import type { Group } from '@prisma/client';
import { getPrisma } from '../config/database.js';

export interface CreateGroupData {
  name: string;
  slug: string;
  description?: string;
  createdById: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string | null;
}

export function create(data: CreateGroupData): Promise<Group> {
  return getPrisma().group.create({ data });
}

export function findManyByMember(userId: string): Promise<Group[]> {
  return getPrisma().group.findMany({
    where: { members: { some: { userId } } },
    orderBy: { name: 'asc' },
  });
}

export function findAll(): Promise<Group[]> {
  return getPrisma().group.findMany({
    orderBy: { name: 'asc' },
  });
}

export function findById(id: string): Promise<Group | null> {
  return getPrisma().group.findUnique({ where: { id } });
}

export function findBySlug(slug: string): Promise<Group | null> {
  return getPrisma().group.findUnique({ where: { slug } });
}

export function update(id: string, data: UpdateGroupData): Promise<Group> {
  return getPrisma().group.update({
    where: { id },
    data,
  });
}

export function deleteGroup(id: string): Promise<void> {
  return getPrisma().group.delete({ where: { id } }).then(() => undefined);
}
