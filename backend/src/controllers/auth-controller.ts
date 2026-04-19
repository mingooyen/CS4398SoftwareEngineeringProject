import type { Request, Response } from 'express';
import * as authService from '../services/auth-service.js';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function refresh(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'Refresh token flow not implemented yet.', code: 'NOT_IMPLEMENTED' });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(204).send();
}
