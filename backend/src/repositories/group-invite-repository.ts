import type { GroupInvite, GroupInviteStatus } from '@prisma/client';
import { getPrisma } from '../config/database.js';

export function create(data: {
  groupId: string;
  inviterUserId: string;
  inviteeUserId: string;
  expiresAt?: Date;
}): Promise<GroupInvite> {
  return getPrisma().groupInvite.create({
    data: {
      groupId: data.groupId,
      inviterUserId: data.inviterUserId,
      inviteeUserId: data.inviteeUserId,
      status: 'PENDING',
      expiresAt: data.expiresAt ?? null,
    },
  });
}

export function findPendingForInvitee(inviteeUserId: string): Promise<GroupInvite[]> {
  return getPrisma().groupInvite.findMany({
    where: { inviteeUserId, status: 'PENDING' },
    include: { group: true, inviter: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function findPendingForGroupAndInvitee(
  groupId: string,
  inviteeUserId: string
): Promise<GroupInvite | null> {
  return getPrisma().groupInvite.findFirst({
    where: { groupId, inviteeUserId, status: 'PENDING' },
  });
}

export function findById(id: string): Promise<GroupInvite | null> {
  return getPrisma().groupInvite.findUnique({
    where: { id },
    include: { group: true, inviter: true, invitee: true },
  });
}

export function updateStatus(id: string, status: GroupInviteStatus): Promise<GroupInvite> {
  return getPrisma().groupInvite.update({
    where: { id },
    data: { status },
  });
}
