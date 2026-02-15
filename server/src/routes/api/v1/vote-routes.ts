import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { validateBody } from '../../../middleware/validate.js';
import { castVoteBodySchema } from '../../../dtos/vote-dtos.js';
import * as voteController from '../../../controllers/vote-controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.get('/', voteController.getVoteResults);
router.post('/', validateBody(castVoteBodySchema), voteController.createOrUpdateVote);
router.patch('/me', validateBody(castVoteBodySchema), voteController.createOrUpdateVote);

export default router;
