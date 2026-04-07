/**
 * TMDB images: store only `posterPath` in the database (e.g. `/xYz.jpg`). Resolve for browsers with
 * `TMDB_IMAGE_BASE` + size (e.g. w500): `${base}${posterPath}`. Same pattern as `resolveCatalogPosterUrl` in
 * `movie-service.ts` for `MovieCatalogEntry`.
 */
export interface TmdbSearchResult {
  id: number;
  title: string;
  posterPath?: string;
  releaseDate?: string;
  overview?: string;
}

export interface TmdbMovieDetails extends TmdbSearchResult {
  runtime?: number;
  genres?: { id: number; name: string }[];
}

export function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  return Promise.resolve([]); // TODO: TMDB API
}

export function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return Promise.resolve({} as TmdbMovieDetails); // TODO: TMDB API
}
