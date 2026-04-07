import type { UserSystemRole } from '@prisma/client';
import type { Request, Response } from 'express';
import * as groupService from '../services/group-service.js';

export async function listGroups(req: Request, res: Response): Promise<void> {
  const systemRole: UserSystemRole = req.systemRole ?? 'USER';
  const groups = await groupService.listForUser(req.userId!, systemRole);
  res.json({
    // UI metadata for requested group subtabs.
    groupTabs: [
      { id: 'groups', label: 'Groups' },
      { id: 'create-group', label: 'Create Group' },
    ],
    defaultGroupTab: 'groups',
    canCreateGroup: true,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      createdById: g.createdById,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
  });
}

export async function createGroup(req: Request, res: Response): Promise<void> {
  const group = await groupService.create(req.userId!, req.body);
  res.status(201).json({ group });
}

export async function getGroup(req: Request, res: Response): Promise<void> {
  res.json({ group: req.group });
}

export async function updateGroup(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params;
  const group = await groupService.update(groupId, req.body);
  res.json({ group });
}

export async function deleteGroup(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params;
  await groupService.deleteGroup(groupId);
  res.status(204).send();
}

export async function joinGroup(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params;
  await groupService.join(groupId, req.userId!);
  res.status(204).send();
}

export async function leaveGroup(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params;
  await groupService.leave(groupId, req.userId!);
  res.status(204).send();
}

export async function getGroupMembers(req: Request, res: Response): Promise<void> {
  const { groupId } = req.params;
  const members = await groupService.getMembers(groupId);
  res.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      groupId: m.groupId,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
}
