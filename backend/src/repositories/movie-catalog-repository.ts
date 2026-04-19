import type { MovieCatalogEntry, MovieCatalogSource } from '@prisma/client';
import { getPrisma } from '../config/database.js';

export type CreateMovieCatalogData = {
  title: string;
  originalTitle?: string | null;
  releaseYear?: number | null;
  tmdbId?: number | null;
  posterPath?: string | null;
  customPosterUrl?: string | null;
  posterStorageKey?: string | null;
  genre?: string | null;
  adminNotes?: string | null;
  source: MovieCatalogSource;
  synopsis?: string | null;
  addedByUserId?: string | null;
};

export function findManyOrdered(): Promise<MovieCatalogEntry[]> {
  return getPrisma().movieCatalogEntry.findMany({
    orderBy: [{ title: 'asc' }],
  });
}

export function create(data: CreateMovieCatalogData): Promise<MovieCatalogEntry> {
  return getPrisma().movieCatalogEntry.create({
    data: {
      title: data.title,
      originalTitle: data.originalTitle,
      releaseYear: data.releaseYear,
      tmdbId: data.tmdbId,
      posterPath: data.posterPath,
      customPosterUrl: data.customPosterUrl,
      posterStorageKey: data.posterStorageKey,
      genre: data.genre,
      adminNotes: data.adminNotes,
      source: data.source,
      synopsis: data.synopsis,
      addedByUserId: data.addedByUserId,
    },
  });
}
