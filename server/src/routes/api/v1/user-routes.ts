import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { validateBody } from '../../../middleware/validate.js';
import { updateProfileBodySchema } from '../../../dtos/user-dtos.js';
import * as userController from '../../../controllers/user-controller.js';

const router = Router();

router.use(requireAuth);
router.get('/me', userController.getMe);
router.patch('/me', validateBody(updateProfileBodySchema), userController.updateMe);
router.get('/me/preferences', userController.getMyPreferences);

export default router;
