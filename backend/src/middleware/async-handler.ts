import type { Request, Response, NextFunction, RequestHandler } from 'express';

/** Express 4: Catch rejected promises from async route handlers and forward to error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/** For async middleware that calls `next` on success. */
export function asyncMiddleware(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
