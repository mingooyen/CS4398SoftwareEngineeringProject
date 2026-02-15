import type { RegisterBody, LoginBody } from '../dtos/auth-dtos.js';

export interface AuthResult {
  user: { id: string; email: string; displayName: string };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function register(dto: RegisterBody): Promise<AuthResult & TokenPair> {
  return Promise.resolve({} as AuthResult & TokenPair); // TODO
}

export function login(dto: LoginBody): Promise<AuthResult & TokenPair> {
  return Promise.resolve({} as AuthResult & TokenPair); // TODO
}

export function refresh(refreshToken: string): Promise<TokenPair> {
  return Promise.resolve({} as TokenPair); // TODO
}

export function revokeRefreshToken(tokenId: string): Promise<void> {
  return Promise.resolve(); // TODO
}
