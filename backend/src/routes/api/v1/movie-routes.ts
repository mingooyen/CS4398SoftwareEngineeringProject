import { Router } from 'express';
import { authenticate, requireAuth } from '../../../middleware/auth.js';
import { requireSystemAdmin } from '../../../middleware/rbac.js';
import { asyncHandler } from '../../../middleware/async-handler.js';
import { validateBody, validateQuery } from '../../../middleware/validate.js';
import {
  discoverQuerySchema,
  searchQuerySchema,
  watchlistBodySchema,
  markWatchedBodySchema,
  createCatalogMovieBodySchema,
} from '../../../dtos/movie-dtos.js';
import * as movieController from '../../../controllers/movie-controller.js';

const router = Router();

router.get('/discover', validateQuery(discoverQuerySchema), asyncHandler(movieController.discoverMovies));
router.get('/genres', asyncHandler(movieController.listMovieGenres));

router.use(authenticate);
router.use(requireAuth);

/** Global catalog: names + poster resolution — all logged-in users. */
router.get('/catalog', asyncHandler(movieController.listCatalog));
/** Add to global catalog — SYSTEM_ADMIN only (see `MovieCatalogEntry` in Prisma). */
router.post(
  '/catalog',
  requireSystemAdmin,
  validateBody(createCatalogMovieBodySchema),
  asyncHandler(movieController.createCatalogMovie)
);

router.get('/search', validateQuery(searchQuerySchema), asyncHandler(movieController.searchMovies));
router.get('/watchlist', movieController.getWatchlist);
router.post('/watchlist', validateBody(watchlistBodySchema), movieController.addToWatchlist);
router.delete('/watchlist/:tmdbId', movieController.removeFromWatchlist);
router.post('/watched', validateBody(markWatchedBodySchema), movieController.markWatched);
router.get('/ratings', movieController.getMyRatings);
router.get('/:tmdbId', movieController.getMovieByTmdbId);

export default router;
