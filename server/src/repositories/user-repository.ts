import type { User } from '@prisma/client';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface UpdateUserData {
  displayName?: string;
}

export function findById(id: string): Promise<User | null> {
  return Promise.resolve(null); // TODO: prisma.user.findUnique
}

export function findByEmail(email: string): Promise<User | null> {
  return Promise.resolve(null); // TODO
}

export function create(data: CreateUserData): Promise<User> {
  return Promise.resolve({} as User); // TODO
}

export function update(id: string, data: UpdateUserData): Promise<User> {
  return Promise.resolve({} as User); // TODO
}
