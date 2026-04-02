import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, NotFoundError } from '../types/errors.js';
import * as groupRepository from '../repositories/group-repository.js';
import * as groupMemberRepository from '../repositories/group-member-repository.js';

/**
 * Loads the group by :groupId (404 if missing). Does not check membership — for public join, etc.
 */
export async function loadGroupOnly(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { groupId } = req.params;
    const group = await groupRepository.findById(groupId);
    if (!group) {
      next(new NotFoundError('Group not found'));
      return;
    }
    req.group = group;
    next();
  } catch (e) {
    next(e as Error);
  }
}

/**
 * Requires group to exist. Caller must be a **member** of the group, unless they are a **system admin**
 * (User.systemRole === SYSTEM_ADMIN), in which case they may access any group for oversight.
 */
export async function requireGroupParticipant(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { groupId } = req.params;
    if (!req.userId) {
      next(new ForbiddenError());
      return;
    }

    const group = await groupRepository.findById(groupId);
    if (!group) {
      next(new NotFoundError('Group not found'));
      return;
    }
    req.group = group;

    if (req.systemRole === 'SYSTEM_ADMIN') {
      req.groupAccess = { kind: 'system_admin' };
      next();
      return;
    }

    const role = await groupMemberRepository.getRole(groupId, req.userId);
    if (!role) {
      next(
        new ForbiddenError('You must be a member of this group to view or participate.')
      );
      return;
    }

    req.groupAccess = { kind: 'member', role };
    next();
  } catch (e) {
    next(e as Error);
  }
}
