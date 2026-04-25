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
  voteAverage?: number;
  genreIds?: number[];
}

export interface TmdbMovieDetails extends TmdbSearchResult {
  runtime?: number;
  genres?: { id: number; name: string }[];
}

export interface TmdbProvider {
  providerId: number;
  providerName: string;
  logoPath?: string;
}

export interface TmdbDiscoveredMovie extends TmdbSearchResult {
  providers: TmdbProvider[];
}

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY is required to fetch live movie data.');
  return key;
}

async function tmdbGet(path: string, params: Record<string, string | number | undefined> = {}): Promise<any> {
  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set('api_key', getApiKey());
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB request failed (${res.status}) for ${path}`);
  return res.json();
}

function toSearchResult(row: any): TmdbSearchResult {
  return {
    id: row.id,
    title: row.title,
    posterPath: row.poster_path ?? undefined,
    releaseDate: row.release_date ?? undefined,
    overview: row.overview ?? undefined,
    voteAverage: row.vote_average ?? undefined,
    genreIds: row.genre_ids ?? undefined,
  };
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbGet('/search/movie', { query, include_adult: 0 });
  return (data.results ?? []).map(toSearchResult);
}

const DISCOVER_PAGE_SIZE = 20;
const DEFAULT_DISCOVER_LIMIT = 50;
/** Max titles returned per discover request (TMDB returns 20 per page; we page until full or window exhausted). */
export const MAX_DISCOVER_LIMIT = 150;
const PROVIDER_ENRICH_MAX = 20;

export type DiscoverSortOptions = {
  sortBy: string;
  voteCountGte?: number;
};

export type DiscoverPageExtras = {
  /** TMDB `with_keywords` (comma = AND). Used for extra browse chips beyond base genres. */
  withKeywords?: string;
};

async function discoverPage(
  region: string,
  page: number,
  withGenres: string | undefined,
  sortOpts: DiscoverSortOptions,
  extras?: DiscoverPageExtras
): Promise<any[]> {
  const params: Record<string, string | number | undefined> = {
    include_adult: 0,
    include_video: 0,
    language: 'en-US',
    page,
    sort_by: sortOpts.sortBy,
    with_genres: withGenres,
    watch_region: region,
  };
  if (extras?.withKeywords) {
    params.with_keywords = extras.withKeywords;
  }
  if (sortOpts.voteCountGte != null && sortOpts.voteCountGte > 0) {
    params['vote_count.gte'] = sortOpts.voteCountGte;
  }
  const data = await tmdbGet('/discover/movie', params);
  return data.results ?? [];
}

const DEFAULT_SORT: DiscoverSortOptions = { sortBy: 'popularity.desc' };

export type DiscoverMoviesExtras = DiscoverPageExtras;

/** Fetches up to `limit` unique movies (TMDB returns 20 per page). */
export async function discoverMovies(
  genreIds: number[],
  region = 'US',
  startPage = 1,
  limit = DEFAULT_DISCOVER_LIMIT,
  sortOpts: DiscoverSortOptions = DEFAULT_SORT,
  fillSortOpts: DiscoverSortOptions = DEFAULT_SORT,
  extras?: DiscoverMoviesExtras
): Promise<TmdbDiscoveredMovie[]> {
  const cap = Math.min(MAX_DISCOVER_LIMIT, Math.max(1, limit));
  const withGenres = genreIds.length ? genreIds.join('|') : undefined;

  const mergedRows: any[] = [];
  const seen = new Set<number>();

  const pushRows = (rows: any[]) => {
    for (const row of rows) {
      if (seen.size >= cap) break;
      if (!row?.id || seen.has(row.id)) continue;
      seen.add(row.id);
      mergedRows.push(row);
    }
  };

  // Enough TMDB pages to fill `cap` unique rows even with overlap/dedupe (20 rows per page).
  const primaryLastPage = startPage + Math.max(4, Math.ceil(cap / 15) + 10);
  let page = startPage;
  while (seen.size < cap && page <= primaryLastPage) {
    const rows = await discoverPage(region, page, withGenres, sortOpts, extras);
    pushRows(rows);
    if (rows.length === 0) break;
    page += 1;
  }

  // If filter is tight, top up (same star rules when primary was vote_average).
  if ((withGenres || extras?.withKeywords) && seen.size < cap) {
    let fillPage = 1;
    const fillLastPage = Math.max(3, Math.ceil(cap / 20) + 4);
    while (seen.size < cap && fillPage <= fillLastPage) {
      const rows = await discoverPage(region, fillPage, undefined, fillSortOpts, undefined);
      pushRows(rows);
      if (rows.length === 0) break;
      fillPage += 1;
    }
  }

  const base: TmdbSearchResult[] = mergedRows.slice(0, cap).map(toSearchResult);

  const enrichedHead = await Promise.all(
    base.slice(0, PROVIDER_ENRICH_MAX).map(async (m) => {
      try {
        const p = await tmdbGet(`/movie/${m.id}/watch/providers`);
        const byRegion = p.results?.[region] ?? p.results?.US ?? null;
        const flats = [...(byRegion?.flatrate ?? []), ...(byRegion?.ads ?? []), ...(byRegion?.rent ?? [])];
        const providerDedup = new Map<number, TmdbProvider>();
        flats.forEach((x: any) => {
          if (!providerDedup.has(x.provider_id)) {
            providerDedup.set(x.provider_id, {
              providerId: x.provider_id,
              providerName: x.provider_name,
              logoPath: x.logo_path ? `${TMDB_LOGO_BASE}${x.logo_path}` : undefined,
            });
          }
        });
        return { ...m, providers: [...providerDedup.values()] };
      } catch {
        return { ...m, providers: [] };
      }
    })
  );

  const tail = base.slice(PROVIDER_ENRICH_MAX).map((m) => ({ ...m, providers: [] as TmdbProvider[] }));
  return [...enrichedHead, ...tail];
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  const data = await tmdbGet(`/movie/${tmdbId}`, { language: 'en-US' });
  return {
    id: data.id,
    title: data.title,
    posterPath: data.poster_path ?? undefined,
    releaseDate: data.release_date ?? undefined,
    overview: data.overview ?? undefined,
    runtime: data.runtime ?? undefined,
    genres: data.genres ?? undefined,
    voteAverage: data.vote_average ?? undefined,
  };
}

export async function getMovieGenres(): Promise<{ id: number; name: string }[]> {
  const data = await tmdbGet('/genre/movie/list', { language: 'en-US' });
  return data.genres ?? [];
}
