import type { User } from '@prisma/client';
import type { UpdateProfileBody } from '../dtos/user-dtos.js';
import { getPrisma } from '../config/database.js';

export interface UserPreferences {
  favoriteGenres?: string[];
}

export interface FriendSearchResult {
  id: number;
  displayName: string;
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

  if (dto.preferences?.favoriteGenres) {
    await prisma.userPreferences.upsert({
      where: { userId },
      update: { favoriteGenres: dto.preferences.favoriteGenres },
      create: {
        userId,
        favoriteGenres: dto.preferences.favoriteGenres,
      },
    });
  }

  return updatedUser;
}

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const prefs = await getPrisma().userPreferences.findUnique({
    where: { userId },
    select: { favoriteGenres: true },
  });

  return {
    favoriteGenres: prefs?.favoriteGenres ?? [],
  };
}

/**
 * Search users by partial displayName or partial id.
 * Returns all matching names, and includes id so duplicate names can be distinguished in UI.
 */
export async function searchUsers(
  query: string,
  actorId: string,
  limit = 20
): Promise<FriendSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const maybeNumeric = /^\d+$/.test(q) ? BigInt(q) : null;

  const users = await getPrisma().user.findMany({
    where: {
      id: { not: actorId },
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        ...(maybeNumeric ? [{ numericId: maybeNumeric }] : []),
      ],
    },
    take: limit,
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    select: {
      numericId: true,
      displayName: true,
    },
  });

  return users
    .filter((u) => u.numericId <= 100000000000n)
    .map((u) => ({ id: Number(u.numericId), displayName: u.displayName }));
}
