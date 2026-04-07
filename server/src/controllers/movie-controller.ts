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

export function searchMovies(req: Request, res: Response): Promise<void> {
  return Promise.resolve(); // TODO
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
