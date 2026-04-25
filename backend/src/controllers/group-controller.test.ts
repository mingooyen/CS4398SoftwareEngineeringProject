import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Group } from '@prisma/client';
import type { Request, Response } from 'express';
import * as groupService from '../services/group-service.js';
import { listGroups, createGroup } from './group-controller.js';

vi.mock('../services/group-service.js', () => ({
  listForUser: vi.fn(),
  create: vi.fn(),
}));

function mockRes(): Response & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
  return res;
}

describe('group-controller', () => {
  beforeEach(() => {
    vi.mocked(groupService.listForUser).mockReset();
    vi.mocked(groupService.create).mockReset();
  });

  it('listGroups returns tab metadata and mapped groups for the current user', async () => {
    const created = new Date('2024-06-01T00:00:00.000Z');
    const updated = new Date('2024-06-02T00:00:00.000Z');
    const g: Group = {
      id: '507f1f77bcf86cd799439011',
      name: 'Movie Night',
      slug: 'movie-night',
      description: 'Weekly',
      createdById: '507f1f77bcf86cd799439012',
      createdAt: created,
      updatedAt: updated,
    };
    vi.mocked(groupService.listForUser).mockResolvedValue([g]);

    const req = {
      userId: '507f1f77bcf86cd799439012',
      systemRole: 'USER' as const,
    } as Request;
    const res = mockRes();

    await listGroups(req, res);

    expect(groupService.listForUser).toHaveBeenCalledWith('507f1f77bcf86cd799439012', 'USER');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultGroupTab: 'groups',
        canCreateGroup: true,
        groups: [
          {
            id: g.id,
            name: g.name,
            slug: g.slug,
            description: g.description,
            createdById: g.createdById,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          },
        ],
      })
    );
  });

  it('createGroup returns 201 with the created group', async () => {
    const group: Group = {
      id: '507f1f77bcf86cd799439011',
      name: 'New',
      slug: 'new',
      description: null,
      createdById: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(groupService.create).mockResolvedValue(group);

    const body = { name: 'New', description: null };
    const req = { userId: 'u1', body } as Request;
    const res = mockRes();

    await createGroup(req, res);

    expect(groupService.create).toHaveBeenCalledWith('u1', body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ group });
  });
});
