import type { Group, GroupMember, UserSystemRole } from '@prisma/client';
import * as groupRepository from '../repositories/group-repository.js';
import * as groupMemberRepository from '../repositories/group-member-repository.js';
import * as groupInviteRepository from '../repositories/group-invite-repository.js';
import * as friendshipRepository from '../repositories/friendship-repository.js';
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

export interface InviteCandidate {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  source: 'friend' | 'other-group';
  mutualGroupNames: string[];
}

export async function getInviteCandidates(
  groupId: string,
  actorUserId: string,
  query: string
): Promise<InviteCandidate[]> {
  const group = await groupRepository.findById(groupId);
  if (!group) throw new NotFoundError('Group not found');

  const members = await groupMemberRepository.findByGroup(groupId);
  const memberIds = new Set(members.map((m) => m.userId));
  memberIds.add(actorUserId);

  const q = query.trim().toLowerCase();
  const prisma = getPrisma();
  const candidates = new Map<string, InviteCandidate>();

  const accepted = await friendshipRepository.findAcceptedForUser(actorUserId);
  for (const f of accepted) {
    const friend = f.requesterUserId === actorUserId ? f.addressee : f.requester;
    if (memberIds.has(friend.id)) continue;
    if (q && !friend.displayName.toLowerCase().includes(q)) continue;
    candidates.set(friend.id, {
      userId: friend.id,
      displayName: friend.displayName,
      source: 'friend',
      mutualGroupNames: [],
    });
  }

  const otherGroupMembers = await prisma.groupMember.findMany({
    where: { groupId: { not: groupId } },
    include: { user: true, group: true },
  });

  for (const gm of otherGroupMembers) {
    if (memberIds.has(gm.userId)) continue;
    if (q && !gm.user.displayName.toLowerCase().includes(q) && !gm.group.name.toLowerCase().includes(q)) {
      continue;
    }
    const existing = candidates.get(gm.userId);
    if (existing) {
      if (!existing.mutualGroupNames.includes(gm.group.name)) {
        existing.mutualGroupNames.push(gm.group.name);
      }
      continue;
    }
    candidates.set(gm.userId, {
      userId: gm.userId,
      displayName: gm.user.displayName,
      source: 'other-group',
      mutualGroupNames: [gm.group.name],
    });
  }

  return [...candidates.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'friend' ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

export async function createGroupInvite(
  groupId: string,
  inviterUserId: string,
  inviteeUserId: string
): Promise<void> {
  const group = await groupRepository.findById(groupId);
  if (!group) throw new NotFoundError('Group not found');

  const existingMember = await groupMemberRepository.getRole(groupId, inviteeUserId);
  if (existingMember) return;

  const pending = await groupInviteRepository.findPendingForGroupAndInvitee(groupId, inviteeUserId);
  if (pending) return;

  await groupInviteRepository.create({ groupId, inviterUserId, inviteeUserId });
}

export async function removeMember(
  groupId: string,
  targetUserId: string,
  actorUserId: string,
  actorSystemRole: UserSystemRole
): Promise<void> {
  const group = await groupRepository.findById(groupId);
  if (!group) throw new NotFoundError('Group not found');

  if (actorSystemRole !== 'SYSTEM_ADMIN' && group.createdById !== actorUserId) {
    throw new ForbiddenError('Only the group creator or system admin can remove members.');
  }

  if (targetUserId === group.createdById) {
    throw new ForbiddenError('Cannot remove the group creator.');
  }

  await groupMemberRepository.remove(groupId, targetUserId);
}
