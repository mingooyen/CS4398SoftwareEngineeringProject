import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { validateBody, validateQuery } from '../../../middleware/validate.js';
import {
  searchQuerySchema,
  watchlistBodySchema,
  markWatchedBodySchema,
} from '../../../dtos/movie-dtos.js';
import * as movieController from '../../../controllers/movie-controller.js';

const router = Router();

router.use(requireAuth);
router.get('/search', validateQuery(searchQuerySchema), movieController.searchMovies);
router.get('/watchlist', movieController.getWatchlist);
router.post('/watchlist', validateBody(watchlistBodySchema), movieController.addToWatchlist);
router.delete('/watchlist/:tmdbId', movieController.removeFromWatchlist);
router.post('/watched', validateBody(markWatchedBodySchema), movieController.markWatched);
router.get('/ratings', movieController.getMyRatings);
router.get('/:tmdbId', movieController.getMovieByTmdbId);

export default router;
