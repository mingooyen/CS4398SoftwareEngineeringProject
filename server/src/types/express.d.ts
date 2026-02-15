import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      refreshTokenId?: string;
    }
  }
}

export type { JwtPayload };
