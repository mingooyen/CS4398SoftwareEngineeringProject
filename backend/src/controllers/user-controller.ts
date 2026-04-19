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
      numericId: user.numericId ?? null,
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
      numericId: user.numericId ?? null,
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

export async function listIncomingFriendRequests(req: Request, res: Response): Promise<void> {
  const requests = await userService.listIncomingFriendRequests(req.userId!);
  res.json({ requests });
}

export async function listFriends(req: Request, res: Response): Promise<void> {
  const friends = await userService.listFriends(req.userId!);
  res.json({ friends });
}

export async function createFriendRequest(req: Request, res: Response): Promise<void> {
  await userService.sendFriendRequest(req.userId!, req.body.targetUserId);
  res.status(204).send();
}

export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  await userService.acceptFriendRequest(req.userId!, req.params.requestId);
  res.status(204).send();
}

export async function denyFriendRequest(req: Request, res: Response): Promise<void> {
  await userService.denyFriendRequest(req.userId!, req.params.requestId);
  res.status(204).send();
}
