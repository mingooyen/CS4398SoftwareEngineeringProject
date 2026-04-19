import type { Friendship, FriendshipStatus } from '@prisma/client';
import { getPrisma } from '../config/database.js';

export function create(
  requesterUserId: string,
  addresseeUserId: string
): Promise<Friendship> {
  return getPrisma().friendship.create({
    data: { requesterUserId, addresseeUserId, status: 'PENDING' },
  });
}

export function findById(id: string): Promise<Friendship | null> {
  return getPrisma().friendship.findUnique({ where: { id } });
}

export function findPendingBetween(
  requesterUserId: string,
  addresseeUserId: string
): Promise<Friendship | null> {
  return getPrisma().friendship.findFirst({
    where: { requesterUserId, addresseeUserId, status: 'PENDING' },
  });
}

export function findAnyBetween(a: string, b: string): Promise<Friendship | null> {
  return getPrisma().friendship.findFirst({
    where: {
      OR: [
        { requesterUserId: a, addresseeUserId: b },
        { requesterUserId: b, addresseeUserId: a },
      ],
    },
  });
}

export function updateStatus(id: string, status: FriendshipStatus): Promise<Friendship> {
  return getPrisma().friendship.update({
    where: { id },
    data: { status },
  });
}

export function findIncoming(userId: string) {
  return getPrisma().friendship.findMany({
    where: { addresseeUserId: userId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { requester: true },
  });
}

export function findAcceptedForUser(userId: string) {
  return getPrisma().friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterUserId: userId }, { addresseeUserId: userId }],
    },
    orderBy: { updatedAt: 'desc' },
    include: { requester: true, addressee: true },
  });
}
