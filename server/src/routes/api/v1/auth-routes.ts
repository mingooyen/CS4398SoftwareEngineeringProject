import { Router } from 'express';
import { validateBody } from '../../../middleware/validate.js';
import { registerBodySchema, loginBodySchema } from '../../../dtos/auth-dtos.js';
import * as authController from '../../../controllers/auth-controller.js';

const router = Router();

router.post('/register', validateBody(registerBodySchema), authController.register);
router.post('/login', validateBody(loginBodySchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
