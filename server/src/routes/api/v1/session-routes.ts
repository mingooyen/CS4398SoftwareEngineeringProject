import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { validateBody } from '../../../middleware/validate.js';
import {
  createSessionBodySchema,
  updateSessionBodySchema,
} from '../../../dtos/session-dtos.js';
import * as sessionController from '../../../controllers/session-controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.get('/', sessionController.listSessions);
router.post('/', validateBody(createSessionBodySchema), sessionController.createSession);
router.get('/:sessionId', sessionController.getSession);
router.patch(
  '/:sessionId',
  validateBody(updateSessionBodySchema),
  sessionController.updateSession
);
router.delete('/:sessionId', sessionController.deleteSession);

export default router;
