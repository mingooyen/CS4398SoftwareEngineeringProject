import type { Request, Response } from 'express';

export function register(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO: authService.register, set cookies, json
}

export function login(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}

export function refresh(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}

export function logout(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}
