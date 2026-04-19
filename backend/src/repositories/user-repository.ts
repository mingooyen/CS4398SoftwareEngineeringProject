import type { User } from '@prisma/client';
import { getPrisma } from '../config/database.js';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
  systemRole?: 'USER' | 'SYSTEM_ADMIN';
}

export interface UpdateUserData {
  displayName?: string;
}

export function findById(id: string): Promise<User | null> {
  return getPrisma().user.findUnique({ where: { id } });
}

export function findByEmail(email: string): Promise<User | null> {
  return getPrisma().user.findUnique({ where: { email: email.toLowerCase() } });
}

export function create(data: CreateUserData): Promise<User> {
  return getPrisma().user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      displayName: data.displayName,
      systemRole: data.systemRole ?? 'USER',
    },
  });
}

export function update(id: string, data: UpdateUserData): Promise<User> {
  return getPrisma().user.update({
    where: { id },
    data,
  });
}
