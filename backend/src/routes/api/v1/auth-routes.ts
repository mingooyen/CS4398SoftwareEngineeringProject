import { Router } from 'express';
import { validateBody } from '../../../middleware/validate.js';
import { registerBodySchema, loginBodySchema } from '../../../dtos/auth-dtos.js';
import * as authController from '../../../controllers/auth-controller.js';
import { asyncHandler } from '../../../middleware/async-handler.js';

const router = Router();

router.post(
  '/register',
  validateBody(registerBodySchema),
  asyncHandler(authController.register)
);
router.post('/login', validateBody(loginBodySchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));

export default router;
