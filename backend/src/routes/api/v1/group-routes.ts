import { Router } from 'express';
import { authenticate, requireAuth } from '../../../middleware/auth.js';
import { requireGroupAdmin } from '../../../middleware/rbac.js';
import { loadGroupOnly, requireGroupParticipant } from '../../../middleware/group-access.js';
import { asyncHandler, asyncMiddleware } from '../../../middleware/async-handler.js';
import { validateBody, validateQuery } from '../../../middleware/validate.js';
import {
  createGroupBodySchema,
  createGroupInviteBodySchema,
  inviteCandidatesQuerySchema,
  updateGroupBodySchema,
} from '../../../dtos/group-dtos.js';
import * as groupController from '../../../controllers/group-controller.js';
import sessionRoutes from './session-routes.js';
import voteRoutes from './vote-routes.js';
import * as recommendationController from '../../../controllers/recommendation-controller.js';

const router = Router();

router.use(authenticate);
router.use(requireAuth);

router.get('/', asyncHandler(groupController.listGroups));
router.post(
  '/',
  validateBody(createGroupBodySchema),
  asyncHandler(groupController.createGroup)
);

/** Anyone authenticated can attempt to join; being a member is not required beforehand. */
router.post(
  '/:groupId/join',
  asyncMiddleware(loadGroupOnly),
  asyncHandler(groupController.joinGroup)
);

/**
 * Routes under /:groupId require membership (or system admin) so only participants see sessions,
 * votes, recommendations, etc.
 */
const groupScoped = Router({ mergeParams: true });
groupScoped.use(asyncMiddleware(requireGroupParticipant));
groupScoped.get('/', asyncHandler(groupController.getGroup));
groupScoped.patch(
  '/',
  requireGroupAdmin,
  validateBody(updateGroupBodySchema),
  asyncHandler(groupController.updateGroup)
);
groupScoped.delete('/', requireGroupAdmin, asyncHandler(groupController.deleteGroup));
groupScoped.post('/leave', asyncHandler(groupController.leaveGroup));
groupScoped.get('/members', asyncHandler(groupController.getGroupMembers));
groupScoped.get(
  '/invite-candidates',
  validateQuery(inviteCandidatesQuerySchema),
  asyncHandler(groupController.getInviteCandidates)
);
groupScoped.post(
  '/invites',
  requireGroupAdmin,
  validateBody(createGroupInviteBodySchema),
  asyncHandler(groupController.createInvite)
);
groupScoped.post(
  '/members/:userId/remove',
  requireGroupAdmin,
  asyncHandler(groupController.removeMember)
);
groupScoped.get(
  '/recommendations',
  asyncHandler(recommendationController.getGroupRecommendations)
);
groupScoped.use('/sessions/:sessionId/votes', voteRoutes);
groupScoped.use('/sessions', sessionRoutes);

router.use('/:groupId', groupScoped);

export default router;
