import type { Request, Response } from 'express';
import * as movieService from '../services/movie-service.js';

export async function listCatalog(req: Request, res: Response): Promise<void> {
  const movies = await movieService.listCatalogMovies();
  res.json({ movies });
}

export async function createCatalogMovie(req: Request, res: Response): Promise<void> {
  const movie = await movieService.createCatalogMovie(req.userId!, req.body);
  res.status(201).json({ movie });
}

export async function searchMovies(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q ?? '');
  const movies = await movieService.searchTmdb(q);
  res.json({ movies });
}

export async function discoverMovies(req: Request, res: Response): Promise<void> {
  const q = req.query as {
    genres?: string;
    region?: string;
    page?: number;
    limit?: number;
    sortBy?:
      | 'popularity.desc'
      | 'vote_average.desc'
      | 'release_date.desc'
      | 'revenue.desc'
      | 'vote_count.desc';
    voteCountGte?: number;
  };
  const genres = String(q.genres ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const region = String(q.region ?? 'US').toUpperCase();
  const page = q.page ?? 1;
  const limit = q.limit ?? 50;
  const sortBy = q.sortBy ?? 'popularity.desc';
  const voteCountGte =
    q.voteCountGte != null && Number.isFinite(Number(q.voteCountGte))
      ? Number(q.voteCountGte)
      : undefined;

  const movies = await movieService.discoverByGenres(genres, region, page, limit, {
    sortBy,
    voteCountGte,
  });
  res.json({ movies });
}

export async function listMovieGenres(_req: Request, res: Response): Promise<void> {
  const genres = await movieService.listTmdbGenres();
  res.json({ genres });
}

export function getMovieByTmdbId(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}

export function addToWatchlist(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}

export function removeFromWatchlist(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}

export function getWatchlist(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}

export function markWatched(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}

export function getMyRatings(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
}
