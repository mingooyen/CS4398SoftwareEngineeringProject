export interface JwtPayload {
  sub: string;
  type: 'access' | 'refresh';
  tokenId?: string;
  iat?: number;
  exp?: number;
}

export function signAccess(payload: Omit<JwtPayload, 'type'>): string {
  return ''; // TODO
}

export function signRefresh(payload: Omit<JwtPayload, 'type'> & { tokenId: string }): string {
  return ''; // TODO
}

export function verifyAccess(token: string): JwtPayload {
  return {} as JwtPayload; // TODO
}

export function verifyRefresh(token: string): JwtPayload {
  return {} as JwtPayload; // TODO
}
