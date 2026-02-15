import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { requireGroupAdmin } from '../../../middleware/rbac.js';
import { validateBody } from '../../../middleware/validate.js';
import {
  createGroupBodySchema,
  updateGroupBodySchema,
} from '../../../dtos/group-dtos.js';
import * as groupController from '../../../controllers/group-controller.js';
import sessionRoutes from './session-routes.js';
import voteRoutes from './vote-routes.js';
import * as recommendationController from '../../../controllers/recommendation-controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', groupController.listGroups);
router.post('/', validateBody(createGroupBodySchema), groupController.createGroup);
router.get('/:groupId', groupController.getGroup);
router.patch(
  '/:groupId',
  requireGroupAdmin,
  validateBody(updateGroupBodySchema),
  groupController.updateGroup
);
router.delete('/:groupId', requireGroupAdmin, groupController.deleteGroup);
router.post('/:groupId/join', groupController.joinGroup);
router.post('/:groupId/leave', groupController.leaveGroup);
router.get('/:groupId/members', groupController.getGroupMembers);
router.get('/:groupId/recommendations', recommendationController.getGroupRecommendations);

router.use('/:groupId/sessions/:sessionId/votes', voteRoutes);
router.use('/:groupId/sessions', sessionRoutes);

export default router;
