import type { Group, GroupMember, UserSystemRole } from '@prisma/client';
import * as groupRepository from '../repositories/group-repository.js';
import * as groupMemberRepository from '../repositories/group-member-repository.js';
import type { CreateGroupBody, UpdateGroupBody } from '../dtos/group-dtos.js';
import { ForbiddenError, NotFoundError } from '../types/errors.js';
import { getPrisma } from '../config/database.js';

export type { GroupMember } from '@prisma/client';
export type GroupMemberRole = 'MEMBER' | 'ADMIN';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'group';
}

async function uniqueSlug(preferred: string): Promise<string> {
  let slug = preferred;
  let n = 0;
  while (await groupRepository.findBySlug(slug)) {
    n += 1;
    slug = `${preferred}-${n}`;
  }
  return slug;
}

/**
 * Lists groups visible to the user: only groups they belong to, unless they are a system admin
 * (then all groups).
 */
export async function listForUser(
  userId: string,
  systemRole: UserSystemRole
): Promise<Group[]> {
  if (systemRole === 'SYSTEM_ADMIN') {
    return groupRepository.findAll();
  }
  return groupRepository.findManyByMember(userId);
}

export async function create(userId: string, dto: CreateGroupBody): Promise<Group> {
  const baseSlug = dto.slug?.trim() ? slugify(dto.slug.trim()) : slugify(dto.name);
  const slug = await uniqueSlug(baseSlug);

  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        createdById: userId,
      },
    });
    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'ADMIN',
      },
    });
    return group;
  });
}

export async function getById(groupId: string): Promise<Group | null> {
  return groupRepository.findById(groupId);
}

export async function update(
  groupId: string,
  dto: UpdateGroupBody
): Promise<Group> {
  const exists = await groupRepository.findById(groupId);
  if (!exists) throw new NotFoundError('Group not found');

  return groupRepository.update(groupId, {
    ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
    ...(dto.description !== undefined
      ? { description: dto.description?.trim() || null }
      : {}),
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  const exists = await groupRepository.findById(groupId);
  if (!exists) throw new NotFoundError('Group not found');
  await groupRepository.deleteGroup(groupId);
}

export async function join(groupId: string, userId: string): Promise<void> {
  const group = await groupRepository.findById(groupId);
  if (!group) throw new NotFoundError('Group not found');

  const existing = await groupMemberRepository.getRole(groupId, userId);
  if (existing) {
    return;
  }

  await groupMemberRepository.add(groupId, userId, 'MEMBER');
}

export async function leave(groupId: string, userId: string): Promise<void> {
  const role = await groupMemberRepository.getRole(groupId, userId);
  if (!role) {
    return;
  }

  if (role === 'ADMIN') {
    const admins = await groupMemberRepository.countAdmins(groupId);
    if (admins <= 1) {
      throw new ForbiddenError(
        'You are the only group admin. Promote another admin before leaving.'
      );
    }
  }

  await groupMemberRepository.remove(groupId, userId);
}

export async function getMembers(groupId: string): Promise<GroupMember[]> {
  const group = await groupRepository.findById(groupId);
  if (!group) throw new NotFoundError('Group not found');
  return groupMemberRepository.findByGroup(groupId);
}

export async function getMemberRole(
  groupId: string,
  userId: string
): Promise<GroupMemberRole | null> {
  return groupMemberRepository.getRole(groupId, userId);
}
