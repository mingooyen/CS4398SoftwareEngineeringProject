import type { User } from '@prisma/client';
import type { UpdateProfileBody } from '../dtos/user-dtos.js';
import { getPrisma } from '../config/database.js';
import { isUserOnline, touchPresence } from './presence-store.js';
import * as friendshipRepository from '../repositories/friendship-repository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../types/errors.js';

function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'bigint') return Number(v);
  return null;
}

export interface UserPreferences {
  favoriteGenres?: string[];
  forYouExcludedGenres?: string[];
}

export interface FriendSearchResult {
  id: string;
  numericId: number | null;
  displayName: string;
}

export interface FriendRequestView {
  id: string;
  requesterUserId: string;
  requesterDisplayName: string;
  requesterNumericId: number | null;
}

export interface FriendView {
  userId: string;
  numericId: number | null;
  displayName: string;
  isOnline: boolean;
}

export function getById(id: string): Promise<User | null> {
  return getPrisma().user.findUnique({ where: { id } });
}

export async function updateProfile(
  userId: string,
  dto: UpdateProfileBody
): Promise<User> {
  const prisma = getPrisma();

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.displayName ? { displayName: dto.displayName.trim() } : {}),
    },
  });

  if (
    dto.preferences &&
    (dto.preferences.favoriteGenres !== undefined ||
      dto.preferences.forYouExcludedGenres !== undefined)
  ) {
    const existing = await prisma.userPreferences.findUnique({ where: { userId } });
    const nextFav =
      dto.preferences.favoriteGenres !== undefined
        ? dto.preferences.favoriteGenres
        : (existing?.favoriteGenres ?? []);
    const nextExcl =
      dto.preferences.forYouExcludedGenres !== undefined
        ? dto.preferences.forYouExcludedGenres
        : (existing?.forYouExcludedGenres ?? []);

    await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        ...(dto.preferences.favoriteGenres !== undefined ? { favoriteGenres: nextFav } : {}),
        ...(dto.preferences.forYouExcludedGenres !== undefined
          ? { forYouExcludedGenres: nextExcl }
          : {}),
      },
      create: {
        userId,
        favoriteGenres: dto.preferences.favoriteGenres ?? [],
        forYouExcludedGenres: dto.preferences.forYouExcludedGenres ?? [],
      },
    });
  }

  return updatedUser;
}

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const prefs = await getPrisma().userPreferences.findUnique({
    where: { userId },
    select: { favoriteGenres: true, forYouExcludedGenres: true },
  });

  return {
    favoriteGenres: prefs?.favoriteGenres ?? [],
    forYouExcludedGenres: prefs?.forYouExcludedGenres ?? [],
  };
}

const INT32_MAX = 2147483647;

/** 1–10 digit positive ids that fit `User.numericId` (Prisma Int). Rejects leading zeros except "0" is not used (min 1). */
function parseNumericUserId(q: string): number | null {
  if (!/^\d+$/.test(q) || q.length > 10) return null;
  const n = Number(q);
  if (!Number.isSafeInteger(n) || n < 1 || n > INT32_MAX) return null;
  if (String(n) !== q) return null;
  return n;
}

/** Mongo ObjectId string form (24 hex chars). */
function isMongoObjectIdString(s: string): boolean {
  return /^[0-9a-f]{24}$/i.test(s);
}

/**
 * Search users by partial displayName, numeric user id (`numericId`), or exact account id (`User.id` / ObjectId string).
 */
export async function searchUsers(
  query: string,
  actorId: string,
  limit = 20
): Promise<FriendSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const numericId = parseNumericUserId(q);
  const objectIdCandidates = isMongoObjectIdString(q)
    ? Array.from(new Set([q, q.toLowerCase()]))
    : [];

  const users = await getPrisma().user.findMany({
    where: {
      id: { not: actorId },
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        ...(numericId != null ? [{ numericId }] : []),
        ...objectIdCandidates.map((id) => ({ id })),
      ],
    },
    take: limit,
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      numericId: true,
      displayName: true,
    },
  });

  return users.map((u) => ({
    id: u.id,
    numericId: toNumberOrNull(u.numericId),
    displayName: u.displayName,
  }));
}

export async function listIncomingFriendRequests(userId: string): Promise<FriendRequestView[]> {
  const requests = await friendshipRepository.findIncoming(userId);
  return requests.map((r) => ({
    id: r.id,
    requesterUserId: r.requesterUserId,
    requesterDisplayName: r.requester.displayName,
    requesterNumericId: toNumberOrNull(r.requester.numericId),
  }));
}

export async function listFriends(userId: string): Promise<FriendView[]> {
  const friendships = await friendshipRepository.findAcceptedForUser(userId);
  return friendships.map((f) => {
    const friend = f.requesterUserId === userId ? f.addressee : f.requester;
    return {
      userId: friend.id,
      numericId: toNumberOrNull(friend.numericId),
      displayName: friend.displayName,
      isOnline: isUserOnline(friend.id),
    };
  });
}

export function recordMyPresence(userId: string): void {
  touchPresence(userId);
}

export async function sendFriendRequest(userId: string, targetUserId: string): Promise<void> {
  if (userId === targetUserId) {
    throw new ValidationError('Cannot send a friend request to yourself.');
  }

  const target = await getPrisma().user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError('Target user not found');

  const existing = await friendshipRepository.findAnyBetween(userId, targetUserId);
  if (existing?.status === 'ACCEPTED') {
    throw new ValidationError('You are already friends.');
  }
  if (existing?.status === 'BLOCKED') {
    throw new ForbiddenError('Cannot send a friend request to this user.');
  }
  if (existing?.status === 'PENDING') {
    throw new ValidationError('A friend request is already pending.');
  }

  await friendshipRepository.create(userId, targetUserId);
}

export async function acceptFriendRequest(userId: string, requestId: string): Promise<void> {
  const request = await friendshipRepository.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new NotFoundError('Friend request not found');
  }
  if (request.addresseeUserId !== userId) {
    throw new ForbiddenError('Only the invited user can accept this request.');
  }
  await friendshipRepository.updateStatus(requestId, 'ACCEPTED');
}

export async function denyFriendRequest(userId: string, requestId: string): Promise<void> {
  const request = await friendshipRepository.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new NotFoundError('Friend request not found');
  }
  if (request.addresseeUserId !== userId) {
    throw new ForbiddenError('Only the invited user can deny this request.');
  }
  await friendshipRepository.updateStatus(requestId, 'BLOCKED');
}
