import type { User } from '@prisma/client';
import type { UpdateProfileBody } from '../dtos/user-dtos.js';

export interface UserPreferences {
  favoriteGenres?: string[];
}

export function getById(id: string): Promise<User | null> {
  return Promise.resolve(null); // TODO
}

export function updateProfile(
  userId: string,
  dto: UpdateProfileBody
): Promise<User> {
  return Promise.resolve({} as User); // TODO
}

export function getPreferences(userId: string): Promise<UserPreferences> {
  return Promise.resolve({}); // TODO
}
