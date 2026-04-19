import bcrypt from 'bcrypt';
import type { RegisterBody, LoginBody } from '../dtos/auth-dtos.js';
import * as userRepository from '../repositories/user-repository.js';
import { signAccess } from '../utils/jwt.js';
import { UnauthorizedError, ValidationError } from '../types/errors.js';

const SALT_ROUNDS = 10;

export interface AuthUserView {
  id: string;
  email: string;
  displayName: string;
  systemRole: 'USER' | 'SYSTEM_ADMIN';
}

export interface LoginResult {
  user: AuthUserView;
  accessToken: string;
}

export async function register(dto: RegisterBody): Promise<LoginResult> {
  const email = dto.email.trim().toLowerCase();
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new ValidationError('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const user = await userRepository.create({
    email,
    passwordHash,
    displayName: dto.displayName.trim(),
  });

  const accessToken = signAccess(user.id, user.systemRole);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      systemRole: user.systemRole,
    },
    accessToken,
  };
}

export async function login(dto: LoginBody): Promise<LoginResult> {
  const email = dto.email.trim().toLowerCase();
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const accessToken = signAccess(user.id, user.systemRole);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      systemRole: user.systemRole,
    },
    accessToken,
  };
}
