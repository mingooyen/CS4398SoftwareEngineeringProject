import { Router } from 'express';
import { authenticate, requireAuth } from '../../../middleware/auth.js';
import { validateBody, validateQuery } from '../../../middleware/validate.js';
import {
  updateProfileBodySchema,
  searchUsersQuerySchema,
} from '../../../dtos/user-dtos.js';
import * as userController from '../../../controllers/user-controller.js';
import { asyncHandler } from '../../../middleware/async-handler.js';

const router = Router();

router.use(authenticate);
router.use(requireAuth);
router.get('/search', validateQuery(searchUsersQuerySchema), asyncHandler(userController.searchUsers));
router.get('/me', asyncHandler(userController.getMe));
router.patch(
  '/me',
  validateBody(updateProfileBodySchema),
  asyncHandler(userController.updateMe)
);
router.get('/me/preferences', asyncHandler(userController.getMyPreferences));

export default router;
