import type { Request, Response } from 'express';
import * as userService from '../services/user-service.js';
import { NotFoundError } from '../types/errors.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await userService.getById(req.userId!);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    user: {
      id: user.id,
      numericId: Number(user.numericId),
      email: user.email,
      displayName: user.displayName,
      highlightedName: user.displayName,
      systemRole: user.systemRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = await userService.updateProfile(req.userId!, req.body);
  res.json({
    user: {
      id: user.id,
      numericId: Number(user.numericId),
      email: user.email,
      displayName: user.displayName,
      highlightedName: user.displayName,
      systemRole: user.systemRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}

export async function getMyPreferences(req: Request, res: Response): Promise<void> {
  const preferences = await userService.getPreferences(req.userId!);
  res.json({ preferences });
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? '');
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const users = await userService.searchUsers(query, req.userId!, limit);
  res.json({
    users,
  });
}
