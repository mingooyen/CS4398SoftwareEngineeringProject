/**
 * DATABASE ENGINEER — movies, names, posters, admin catalog
 *
 * **Canonical storage** for the app-wide movie list is `MovieCatalogEntry` (see `schema.prisma`
 * for column-level notes, TMDB vs upload vs URL, and indexing suggestions).
 *
 * **API**
 * - `GET /api/v1/movies/catalog` — any authenticated user; returns titles + resolved `posterUrl` when possible.
 * - `POST /api/v1/movies/catalog` — `User.systemRole = SYSTEM_ADMIN` only; inserts a catalog row.
 *
 * **Env you may define**
 * - `TMDB_IMAGE_BASE` — default `https://image.tmdb.org/t/p/w500` (append `posterPath`).
 * - `POSTER_CDN_BASE_URL` — public base for object storage keys in `posterStorageKey` (no trailing slash required; we normalize).
 *
 * Implement TMDB search/detail in `searchTmdb` / `getTmdbDetails` and optionally sync into `MovieCatalogEntry` via jobs or admin UI.
 */
import type { MovieCatalogEntry } from '@prisma/client';
import type { TmdbSearchResult, TmdbMovieDetails } from '../utils/tmdb-client.js';
import type { CreateCatalogMovieBody, MarkWatchedBody } from '../dtos/movie-dtos.js';
import * as movieCatalogRepository from '../repositories/movie-catalog-repository.js';
import * as tmdbClient from '../utils/tmdb-client.js';

export interface WatchlistEntry {
  id: string;
  tmdbId: number;
  addedAt: Date;
}

export interface Rating {
  tmdbId: number;
  rating: number;
}

/** Full poster URL for discover/search results (`poster_path` from TMDB). */
export function resolveDiscoverPosterUrl(posterPath?: string | null): string | null {
  const raw = posterPath?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const base =
    process.env.TMDB_IMAGE_BASE?.replace(/\/$/, '') ?? 'https://image.tmdb.org/t/p/w500';
  return `${base}${path}`;
}

/** Resolved poster for API consumers; null if no poster fields set. */
export function resolveCatalogPosterUrl(entry: MovieCatalogEntry): string | null {
  const cdnBase = process.env.POSTER_CDN_BASE_URL?.replace(/\/$/, '');
  if (entry.posterStorageKey && cdnBase) {
    const key = entry.posterStorageKey.replace(/^\//, '');
    return `${cdnBase}/${key}`;
  }
  if (entry.customPosterUrl) {
    return entry.customPosterUrl;
  }
  const tmdbBase =
    process.env.TMDB_IMAGE_BASE?.replace(/\/$/, '') ?? 'https://image.tmdb.org/t/p/w500';
  if (entry.posterPath) {
    const path = entry.posterPath.startsWith('/') ? entry.posterPath : `/${entry.posterPath}`;
    return `${tmdbBase}${path}`;
  }
  return null;
}

export function catalogEntryToJson(entry: MovieCatalogEntry) {
  return {
    id: entry.id,
    title: entry.title,
    originalTitle: entry.originalTitle,
    releaseYear: entry.releaseYear,
    tmdbId: entry.tmdbId,
    posterPath: entry.posterPath,
    customPosterUrl: entry.customPosterUrl,
    posterStorageKey: entry.posterStorageKey,
    posterUrl: resolveCatalogPosterUrl(entry),
    source: entry.source,
    genre: entry.genre,
    adminNotes: entry.adminNotes,
    synopsis: entry.synopsis,
    addedByUserId: entry.addedByUserId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function listCatalogMovies(): Promise<ReturnType<typeof catalogEntryToJson>[]> {
  return movieCatalogRepository.findManyOrdered().then((rows) => rows.map(catalogEntryToJson));
}

export function createCatalogMovie(
  adminUserId: string,
  dto: CreateCatalogMovieBody
): Promise<ReturnType<typeof catalogEntryToJson>> {
  const source =
    dto.source ?? (dto.tmdbId != null || dto.posterPath != null ? 'TMDB' : 'CUSTOM_ADMIN');

  return movieCatalogRepository
    .create({
      title: dto.title.trim(),
      originalTitle: dto.originalTitle?.trim() || null,
      releaseYear: dto.releaseYear ?? null,
      tmdbId: dto.tmdbId ?? null,
      posterPath: dto.posterPath?.trim() || null,
      customPosterUrl: dto.customPosterUrl ?? null,
      posterStorageKey: dto.posterStorageKey?.trim() || null,
      genre: dto.genre?.trim() || null,
      adminNotes: dto.adminNotes?.trim() || null,
      source,
      synopsis: dto.synopsis?.trim() || null,
      addedByUserId: adminUserId,
    })
    .then(catalogEntryToJson);
}

export function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  return tmdbClient.searchMovies(query);
}

export function getTmdbDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdbClient.getMovieDetails(tmdbId);
}

/** Offline catalog: unique titles so narrow genre filters never repeat the same two films. */
const FALLBACK_MOVIES: {
  id: number;
  title: string;
  year: number;
  rating: number;
  genre: string;
  posterPath: string | null;
}[] = [
  { id: 603, title: 'The Matrix', year: 1999, rating: 8.2, genre: 'Sci-Fi', posterPath: '/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg' },
  { id: 680, title: 'Pulp Fiction', year: 1994, rating: 8.5, genre: 'Crime', posterPath: '/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg' },
  { id: 13, title: 'Forrest Gump', year: 1994, rating: 8.4, genre: 'Drama', posterPath: '/saHP97rTPS5eLmrLQEcANmKrsFl.jpg' },
  { id: 155, title: 'The Dark Knight', year: 2008, rating: 8.5, genre: 'Action', posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { id: 671, title: "Harry Potter and the Sorcerer's Stone", year: 2001, rating: 7.9, genre: 'Fantasy', posterPath: '/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg' },
  { id: 862, title: 'Toy Story', year: 1995, rating: 7.9, genre: 'Animation', posterPath: '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg' },
  { id: 675, title: 'Harry Potter and the Order of the Phoenix', year: 2007, rating: 7.7, genre: 'Adventure', posterPath: '/5aOyriWkPec0zUDxmHFP9qMmBaj.jpg' },
  { id: 424, title: "Schindler's List", year: 1993, rating: 8.6, genre: 'History', posterPath: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg' },
  { id: 238, title: 'The Godfather', year: 1972, rating: 8.7, genre: 'Drama', posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' },
  { id: 27205, title: 'Inception', year: 2010, rating: 8.3, genre: 'Sci-Fi', posterPath: '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg' },
  { id: 550, title: 'Fight Club', year: 1999, rating: 8.8, genre: 'Drama', posterPath: '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg' },
  { id: 278, title: 'The Shawshank Redemption', year: 1994, rating: 8.7, genre: 'Drama', posterPath: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg' },
  { id: 120, title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001, rating: 8.8, genre: 'Fantasy', posterPath: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg' },
  { id: 129, title: 'Spirited Away', year: 2001, rating: 8.6, genre: 'Animation', posterPath: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg' },
  { id: 496243, title: 'Parasite', year: 2019, rating: 8.5, genre: 'Thriller', posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
  { id: 244786, title: 'Whiplash', year: 2014, rating: 8.5, genre: 'Drama', posterPath: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg' },
  { id: 299534, title: 'Avengers: Endgame', year: 2019, rating: 8.4, genre: 'Action', posterPath: '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg' },
  { id: 19995, title: 'Avatar', year: 2009, rating: 7.9, genre: 'Sci-Fi', posterPath: '/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg' },
  { id: 157336, title: 'Interstellar', year: 2014, rating: 8.6, genre: 'Sci-Fi', posterPath: '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg' },
  { id: 122, title: 'The Lord of the Rings: The Return of the King', year: 2003, rating: 8.9, genre: 'Fantasy', posterPath: '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg' },
  { id: 121, title: 'The Lord of the Rings: The Two Towers', year: 2002, rating: 8.7, genre: 'Fantasy', posterPath: '/5VTN0pR8gcqV3EPUHHfMGnJYN9L.jpg' },
  { id: 769, title: 'GoodFellas', year: 1990, rating: 8.7, genre: 'Crime', posterPath: '/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg' },
  { id: 497, title: 'The Green Mile', year: 1999, rating: 8.6, genre: 'Drama', posterPath: '/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg' },
  { id: 637, title: 'Life Is Beautiful', year: 1997, rating: 8.6, genre: 'Drama', posterPath: '/mfnkSeeVOBVheuyn2lo4tfmOPQb.jpg' },
  { id: 346, title: 'Seven Samurai', year: 1954, rating: 8.6, genre: 'Action', posterPath: '/lOMGc8bnSwQhS4XyE1S99uH8NXf.jpg' },
  { id: 324857, title: 'Spider-Man: Into the Spider-Verse', year: 2018, rating: 8.4, genre: 'Animation', posterPath: '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg' },
  { id: 324852, title: 'Spider-Man: Far From Home', year: 2019, rating: 7.4, genre: 'Action', posterPath: '/6t3YWl7hrr88lCEFlGVqW5yV99R.jpg' },
  { id: 315635, title: 'Spider-Man: Homecoming', year: 2017, rating: 7.4, genre: 'Action', posterPath: '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg' },
  { id: 557, title: 'Spider-Man', year: 2002, rating: 7.4, genre: 'Action', posterPath: '/kjdJntyBeEvqm9w97QGBdxPptzj.jpg' },
  { id: 105, title: 'Back to the Future', year: 1985, rating: 8.3, genre: 'Sci-Fi', posterPath: '/vN5B5WgYscRGcQpVhHl6p9DDTP0.jpg' },
  { id: 106, title: 'Back to the Future Part II', year: 1989, rating: 7.8, genre: 'Sci-Fi', posterPath: '/k3mW4qfJo6SKqe6laRyNGnbB9n5.jpg' },
  { id: 107, title: 'Back to the Future Part III', year: 1990, rating: 7.4, genre: 'Western', posterPath: '/kJZoAHq1SLDdWjeNGtlHAnGpmFV.jpg' },
  { id: 16869, title: 'Inglourious Basterds', year: 2009, rating: 8.3, genre: 'War', posterPath: '/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg' },
  { id: 68718, title: 'Django Unchained', year: 2012, rating: 8.4, genre: 'Western', posterPath: '/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg' },
  { id: 1891, title: 'The Empire Strikes Back', year: 1980, rating: 8.4, genre: 'Sci-Fi', posterPath: '/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg' },
  { id: 11, title: 'Star Wars', year: 1977, rating: 8.6, genre: 'Sci-Fi', posterPath: '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg' },
  { id: 330459, title: 'Rogue One: A Star Wars Story', year: 2016, rating: 7.5, genre: 'Sci-Fi', posterPath: '/i0yw1mFbB7sNGHCs7EXZPzFkdA1.jpg' },
  { id: 140607, title: 'Star Wars: The Force Awakens', year: 2015, rating: 7.8, genre: 'Sci-Fi', posterPath: '/wqnLdwVXoBjKibFRR5U3y0aDUhs.jpg' },
  { id: 181808, title: 'Star Wars: The Last Jedi', year: 2017, rating: 6.9, genre: 'Sci-Fi', posterPath: '/kOVEVeg59E0wsnXmF9nrh6OmWII.jpg' },
  { id: 181812, title: 'Star Wars: The Rise of Skywalker', year: 2019, rating: 6.4, genre: 'Sci-Fi', posterPath: '/db32LaOibwEliAmSL2jjDF6oDdj.jpg' },
  { id: 585, title: 'Monsters, Inc.', year: 2001, rating: 8.1, genre: 'Animation', posterPath: '/wFSpyMsp7H0ttERbxY7Trlv8xry.jpg' },
  { id: 508947, title: 'Turning Red', year: 2022, rating: 7.0, genre: 'Animation', posterPath: '/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg' },
  { id: 10674, title: 'Mulan', year: 1998, rating: 7.6, genre: 'Animation', posterPath: '/jAbexAtB0aSfP5Ay4TpWHARyVnG.jpg' },
  { id: 364, title: 'Batman Returns', year: 1992, rating: 7.1, genre: 'Action', posterPath: '/jKBjeXM7iBBV9UkUcOXx3m7FSHY.jpg' },
  { id: 414, title: 'Batman Forever', year: 1995, rating: 5.4, genre: 'Action', posterPath: '/i0fJS8M5UKoETjjJ0zwUiKaR8tr.jpg' },
  { id: 268, title: 'Batman', year: 1989, rating: 7.5, genre: 'Action', posterPath: '/cij4dd21v2Rk2YtUQbV5kW69WB2.jpg' },
  { id: 209112, title: 'Batman v Superman: Dawn of Justice', year: 2016, rating: 6.1, genre: 'Action', posterPath: '/5UsK3grJvtQrtzEgqNlDljJW96w.jpg' },
  { id: 475557, title: 'Joker', year: 2019, rating: 8.2, genre: 'Thriller', posterPath: '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg' },
  { id: 19404, title: 'Dilwale Dulhania Le Jayenge', year: 1995, rating: 8.6, genre: 'Romance', posterPath: '/2CAL2433ZeIihfX1Hb2139CX0pW.jpg' },
  { id: 109445, title: 'Frozen', year: 2013, rating: 7.3, genre: 'Animation', posterPath: '/itAKcobTYGpYT8Phwjd8c9hleTo.jpg' },
  { id: 38757, title: 'Tangled', year: 2010, rating: 7.6, genre: 'Animation', posterPath: '/ym7Kst6a4uodryxqbGOxmewF235.jpg' },
  { id: 98, title: 'Gladiator', year: 2000, rating: 8.2, genre: 'Action', posterPath: '/wN2xWp1eIwCKOD0BHTcErTBv1Uq.jpg' },
  { id: 508, title: 'Love Actually', year: 2003, rating: 7.1, genre: 'Comedy', posterPath: '/7QPeVsr9rcFU9Gl90yg0gTOTpVv.jpg' },
  { id: 453, title: 'A Beautiful Mind', year: 2001, rating: 7.9, genre: 'Drama', posterPath: '/zwzWCmH72OSC9NA0ipoqw5Zjya8.jpg' },
  { id: 545611, title: 'Everything Everywhere All at Once', year: 2022, rating: 7.7, genre: 'Sci-Fi', posterPath: '/u68AjlvlutfEIcpmbYpKcdi09ut.jpg' },
  { id: 438631, title: 'Dune', year: 2021, rating: 7.8, genre: 'Sci-Fi', posterPath: '/gDzOcq0pfeCeqMBwKIJlSmQpjkZ.jpg' },
  { id: 447365, title: 'Guardians of the Galaxy Vol. 3', year: 2023, rating: 7.9, genre: 'Sci-Fi', posterPath: '/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg' },
  { id: 346698, title: 'Barbie', year: 2023, rating: 6.9, genre: 'Comedy', posterPath: '/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg' },
  { id: 872585, title: 'Oppenheimer', year: 2023, rating: 8.0, genre: 'Drama', posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
  { id: 414906, title: 'The Batman', year: 2022, rating: 7.7, genre: 'Thriller', posterPath: '/74xTEgt7R36Fpooo50r9T25onhq.jpg' },
  { id: 502356, title: 'The Super Mario Bros. Movie', year: 2023, rating: 7.6, genre: 'Animation', posterPath: '/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg' },
  { id: 76341, title: 'Mad Max: Fury Road', year: 2015, rating: 7.6, genre: 'Action', posterPath: '/hA2ple9q4qnwxp3hKVNhroipsir.jpg' },
  { id: 106646, title: 'The Wolf of Wall Street', year: 2013, rating: 8.0, genre: 'Crime', posterPath: '/kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg' },
  { id: 976573, title: 'Elemental', year: 2023, rating: 7.6, genre: 'Animation', posterPath: '/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg' },
  { id: 361743, title: 'Top Gun: Maverick', year: 2022, rating: 8.2, genre: 'Action', posterPath: '/62HCnUTziyWcpDaBO2i1DX17ljH.jpg' },
  { id: 615457, title: 'Nobody', year: 2021, rating: 7.9, genre: 'Action', posterPath: '/oBgWY00bEFeZ9N25wWVyuQddbAo.jpg' },
  { id: 693134, title: 'Dune: Part Two', year: 2024, rating: 8.1, genre: 'Sci-Fi', posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg' },
  { id: 299536, title: 'Avengers: Infinity War', year: 2018, rating: 8.2, genre: 'Action', posterPath: '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg' },
  { id: 346364, title: 'It', year: 2017, rating: 7.2, genre: 'Horror', posterPath: '/9E2y5Q7WlCVNEhP5GiVTjhEhx1o.jpg' },
  { id: 597, title: 'Titanic', year: 1997, rating: 7.9, genre: 'Romance', posterPath: '/9xjZS2rlNxm24GLRxRuf4fbxDWE.jpg' },
  { id: 807, title: 'Se7en', year: 1995, rating: 8.3, genre: 'Thriller', posterPath: '/zrSOTwsmupQiOuwABP01AgM4YLf.jpg' },
  { id: 240, title: 'The Godfather Part II', year: 1974, rating: 9.0, genre: 'Drama', posterPath: '/AmYrVwFmtdCzvI8QMQWjanbKQzM.jpg' },
  { id: 1124, title: 'The Prestige', year: 2006, rating: 8.5, genre: 'Thriller', posterPath: '/bdN3gXu1rAlAwCqP2T5W99RKBax.jpg' },
  { id: 77, title: 'Memento', year: 2000, rating: 8.4, genre: 'Thriller', posterPath: '/yuNs09hYgeWSlgrAVGLzHG9lAMz.jpg' },
  { id: 857, title: 'Saving Private Ryan', year: 1998, rating: 8.6, genre: 'War', posterPath: '/miDo9l7YDLh7Z4gg7n61QzF6w9B.jpg' },
  { id: 85, title: 'Raiders of the Lost Ark', year: 1981, rating: 8.4, genre: 'Adventure', posterPath: '/ceG9VCzoXuLf173BwlwvTAnsJP0.jpg' },
  { id: 280, title: 'Terminator 2: Judgment Day', year: 1991, rating: 8.6, genre: 'Sci-Fi', posterPath: '/5M0j0B18abgBI9Fp2Vqp1nUKrgS.jpg' },
  { id: 348, title: 'Alien', year: 1979, rating: 8.4, genre: 'Horror', posterPath: '/vfrQk5IPloGG1Nr9F5EPbACKhzy.jpg' },
  { id: 679, title: 'Aliens', year: 1986, rating: 8.4, genre: 'Sci-Fi', posterPath: '/hzCaSFLT9yq4RoCKdDUkoOKTWm0.jpg' },
  { id: 137, title: 'Groundhog Day', year: 1993, rating: 8.0, genre: 'Comedy', posterPath: '/gCgt1BALMPrmpl5vt4Db0A9cqVF.jpg' },
  { id: 808, title: 'Shrek', year: 2001, rating: 8.0, genre: 'Animation', posterPath: '/iujYostCZil2Vxn56JDmvJmgwtW.jpg' },
  { id: 12, title: 'Finding Nemo', year: 2003, rating: 8.2, genre: 'Animation', posterPath: '/eHuGQ10FUz5AnhYEQpGUBUrlT3b.jpg' },
  { id: 8587, title: 'The Lion King', year: 1994, rating: 8.5, genre: 'Animation', posterPath: '/sKCr78MXSLixwmZ8DyJLrpMcd15.jpg' },
  { id: 354912, title: 'Coco', year: 2017, rating: 8.4, genre: 'Animation', posterPath: '/gGEsBPAijhUUFJDgdcdJHZ4SnMp.jpg' },
  { id: 546554, title: 'Knives Out', year: 2019, rating: 7.9, genre: 'Mystery', posterPath: '/pThyQovXQrw2q0Q9ZH0mrNqaKGJ.jpg' },
  { id: 313369, title: 'La La Land', year: 2016, rating: 8.0, genre: 'Romance', posterPath: '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg' },
  { id: 37799, title: 'The Social Network', year: 2010, rating: 7.8, genre: 'Drama', posterPath: '/n0cEjHsJEHtgjEvukim0CbuhTYF.jpg' },
  { id: 6977, title: 'No Country for Old Men', year: 2007, rating: 8.1, genre: 'Thriller', posterPath: '/6JoRHa6euadEu149PofWlnWdMYx.jpg' },
  { id: 7340, title: 'There Will Be Blood', year: 2007, rating: 8.2, genre: 'Drama', posterPath: '/fa0RDUpGaSDjXU_ad9EHG8-XRqv.jpg' },
  { id: 274, title: 'The Silence of the Lambs', year: 1991, rating: 8.3, genre: 'Thriller', posterPath: '/rplLJ2hHbOSiPMOPT6hHyV0PEzn.jpg' },
  { id: 1422, title: 'The Departed', year: 2006, rating: 8.2, genre: 'Crime', posterPath: '/r9QusTGjNMx2IPKN3CU31466Sql.jpg' },
  { id: 78, title: 'Blade Runner', year: 1982, rating: 8.1, genre: 'Sci-Fi', posterPath: '/vfzE3PJ85K2EHArGMJ9WUlvsu2v.jpg' },
  { id: 745, title: 'The Untouchables', year: 1987, rating: 7.8, genre: 'Crime', posterPath: '/jcpa9gTuHrPJYnLWqA2pIwU55Jn.jpg' },
  {
    id: 4935,
    title: "Howl's Moving Castle",
    year: 2004,
    rating: 8.4,
    genre: 'Animation',
    posterPath: '/jpUeKgLmzuWGtjIEW0aBVsM6x82.jpg',
  },
  { id: 335984, title: 'Blade Runner 2049', year: 2017, rating: 8.0, genre: 'Sci-Fi', posterPath: '/gajva2L0rHYkAT2S0iqoQB8WUmp.jpg' },
  { id: 263115, title: 'Logan', year: 2017, rating: 8.1, genre: 'Action', posterPath: '/fnbjcRDYn6YviOceSK1dug6AYS5.jpg' },
  { id: 447332, title: 'A Quiet Place', year: 2018, rating: 7.5, genre: 'Horror', posterPath: '/nAU74zmpbhouR93TWjvJPuFc2lT.jpg' },
  { id: 419430, title: 'Get Out', year: 2017, rating: 7.8, genre: 'Thriller', posterPath: '/tFXcEccSazf6qY3107PdHA62sM6.jpg' },
  { id: 490132, title: 'Green Book', year: 2018, rating: 8.2, genre: 'Drama', posterPath: '/hjxIZvD3IB476BabcILbTHL63L9.jpg' },
  { id: 399055, title: 'The Shape of Water', year: 2017, rating: 7.3, genre: 'Drama', posterPath: '/wcIwLS0aAwn0madSHKTECspCtPK.jpg' },
];

function normalizeUserGenreLabel(raw: string): string {
  const k = raw.trim().toLowerCase();
  const aliases: Record<string, string> = {
    'sci-fi': 'science fiction',
    scifi: 'science fiction',
    'science fiction': 'science fiction',
    sf: 'science fiction',
    romcom: 'comedy',
    'rom-com': 'comedy',
    doc: 'documentary',
  };
  return aliases[k] ?? k;
}

/** Extra browse chips beyond TMDB’s flat genre list (OR-genres or a single keyword). */
type BrowseExtraDef = {
  key: string;
  display: string;
  /** TMDB genre ids joined with | in discover */
  tmdbIds?: number[];
  /** TMDB keyword ids (comma for discover `with_keywords`; use one id when possible) */
  keywordIds?: number[];
  /** Lowercase labels matching `FALLBACK_MOVIES.genre` for offline mode */
  offlineLabels: string[];
};

const BROWSE_EXTRA_CHIPS: BrowseExtraDef[] = [
  { key: 'action & adventure', display: 'Action & Adventure', tmdbIds: [28, 12], offlineLabels: ['action', 'adventure'] },
  { key: 'sci-fi & fantasy', display: 'Sci-Fi & Fantasy', tmdbIds: [878, 14], offlineLabels: ['sci-fi', 'fantasy'] },
  { key: 'crime & thriller', display: 'Crime & Thriller', tmdbIds: [80, 53], offlineLabels: ['crime', 'thriller'] },
  { key: 'mystery & thriller', display: 'Mystery & Thriller', tmdbIds: [9648, 53], offlineLabels: ['mystery', 'thriller'] },
  { key: 'romantic comedy', display: 'Romantic Comedy', tmdbIds: [10749, 35], offlineLabels: ['romance', 'comedy'] },
  { key: 'horror & thriller', display: 'Horror & Thriller', tmdbIds: [27, 53], offlineLabels: ['horror', 'thriller'] },
  { key: 'animation & family', display: 'Animation & Family', tmdbIds: [16, 10751], offlineLabels: ['animation', 'fantasy'] },
  { key: 'war & history', display: 'War & History', tmdbIds: [10752, 36], offlineLabels: ['war', 'history'] },
  { key: 'comedy & family', display: 'Comedy & Family', tmdbIds: [35, 10751], offlineLabels: ['comedy', 'animation'] },
  { key: 'epic & drama', display: 'Epic & Drama', tmdbIds: [36, 18], offlineLabels: ['history', 'drama'] },
  { key: 'superhero', display: 'Superhero', keywordIds: [9715], offlineLabels: ['action', 'sci-fi', 'fantasy'] },
  { key: 'action & sci-fi', display: 'Action & Sci-Fi', tmdbIds: [28, 878], offlineLabels: ['action', 'sci-fi'] },
  { key: 'fantasy & adventure', display: 'Fantasy & Adventure', tmdbIds: [14, 12], offlineLabels: ['fantasy', 'adventure'] },
  { key: 'romance & drama', display: 'Romance & Drama', tmdbIds: [10749, 18], offlineLabels: ['romance', 'drama'] },
  { key: 'comedy & action', display: 'Comedy & Action', tmdbIds: [35, 28], offlineLabels: ['comedy', 'action'] },
  { key: 'horror & sci-fi', display: 'Horror & Sci-Fi', tmdbIds: [27, 878], offlineLabels: ['horror', 'sci-fi', 'thriller'] },
  { key: 'family & comedy', display: 'Family & Comedy', tmdbIds: [10751, 35], offlineLabels: ['animation', 'comedy'] },
  { key: 'war & action', display: 'War & Action', tmdbIds: [10752, 28], offlineLabels: ['war', 'action'] },
  { key: 'western & action', display: 'Western & Action', tmdbIds: [37, 28], offlineLabels: ['western', 'action'] },
  { key: 'music & drama', display: 'Music & Drama', tmdbIds: [10402, 18], offlineLabels: ['drama', 'animation'] },
  { key: 'mystery & drama', display: 'Mystery & Drama', tmdbIds: [9648, 18], offlineLabels: ['mystery', 'drama'] },
  { key: 'fantasy & drama', display: 'Fantasy & Drama', tmdbIds: [14, 18], offlineLabels: ['fantasy', 'drama'] },
  { key: 'sci-fi & thriller', display: 'Sci-Fi & Thriller', tmdbIds: [878, 53], offlineLabels: ['sci-fi', 'thriller'] },
  { key: 'sports', display: 'Sports', keywordIds: [6075], offlineLabels: ['action', 'drama', 'comedy'] },
  { key: 'zombie', display: 'Zombie', keywordIds: [12377], offlineLabels: ['horror', 'thriller', 'sci-fi'] },
  { key: 'heist', display: 'Heist', keywordIds: [10051], offlineLabels: ['crime', 'thriller', 'action'] },
  { key: 'spy', display: 'Spy', keywordIds: [470], offlineLabels: ['action', 'thriller', 'crime'] },
  { key: 'film noir', display: 'Film Noir', keywordIds: [9807], offlineLabels: ['crime', 'drama', 'thriller'] },
  { key: 'anime', display: 'Anime', keywordIds: [210024], offlineLabels: ['animation', 'fantasy', 'sci-fi'] },
];

function findBrowseExtraDef(genreNames: string[]): BrowseExtraDef | undefined {
  if (genreNames.length !== 1) return undefined;
  const key = genreNames[0].trim().toLowerCase();
  return BROWSE_EXTRA_CHIPS.find((c) => c.key === key);
}

function resolveDiscoverGenreIds(
  genreNames: string[],
  tmdbGenres: { id: number; name: string }[]
): number[] {
  const extra = findBrowseExtraDef(genreNames);
  if (extra?.tmdbIds?.length) return extra.tmdbIds;

  const wanted = new Set(
    genreNames.map((g) => normalizeUserGenreLabel(g)).filter(Boolean)
  );
  return tmdbGenres.filter((g) => wanted.has(g.name.toLowerCase())).map((g) => g.id);
}

function discoverExtrasForGenres(genreNames: string[]): { withKeywords?: string } | undefined {
  const extra = findBrowseExtraDef(genreNames);
  if (extra?.keywordIds?.length) {
    return { withKeywords: extra.keywordIds.map(String).join(',') };
  }
  return undefined;
}

function offlineWantedLabels(genreNames: string[]): Set<string> {
  const extra = findBrowseExtraDef(genreNames);
  if (extra) return new Set(extra.offlineLabels);
  return new Set(genreNames.map((g) => normalizeUserGenreLabel(g)).filter(Boolean));
}

type OfflineDiscoverSort = 'default' | 'rating' | 'year';

function fallbackByGenres(genreNames: string[], limit = 50, offlineSort: OfflineDiscoverSort = 'default') {
  const cap = Math.min(150, Math.max(1, limit));
  const wanted = offlineWantedLabels(genreNames);
  let pool = [...FALLBACK_MOVIES];
  if (wanted.size === 0) {
    if (offlineSort === 'rating') pool.sort((a, b) => b.rating - a.rating);
    else if (offlineSort === 'year') pool.sort((a, b) => b.year - a.year);
  }
  const matched = wanted.size
    ? pool.filter((m) => wanted.has(m.genre.toLowerCase()))
    : [];
  const usedTitles = new Set<string>();
  const out: typeof FALLBACK_MOVIES = [];
  for (const m of matched) {
    if (out.length >= cap) break;
    if (usedTitles.has(m.title)) continue;
    usedTitles.add(m.title);
    out.push(m);
  }
  for (const m of pool) {
    if (out.length >= cap) break;
    if (usedTitles.has(m.title)) continue;
    usedTitles.add(m.title);
    out.push(m);
  }
  return out.slice(0, cap).map((m, i) => ({
    id: m.id * 1000 + i,
    title: m.title,
    year: m.year,
    rating: m.rating,
    poster: resolveDiscoverPosterUrl(m.posterPath),
    providers: [],
    genres: [],
  }));
}

function mergeBrowseGenreRows(base: { id: number; name: string }[]): { id: number; name: string }[] {
  const seen = new Set(base.map((g) => g.name.trim().toLowerCase()));
  const extras = BROWSE_EXTRA_CHIPS.map((c, i) => ({
    id: 990_000 + i,
    name: c.display,
  })).filter((g) => !seen.has(g.name.trim().toLowerCase()));
  return [...base, ...extras].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listTmdbGenres(): Promise<{ id: number; name: string }[]> {
  try {
    const base = await tmdbClient.getMovieGenres();
    return mergeBrowseGenreRows(base);
  } catch {
    return mergeBrowseGenreRows([
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 99, name: 'Documentary' },
      { id: 18, name: 'Drama' },
      { id: 10751, name: 'Family' },
      { id: 14, name: 'Fantasy' },
      { id: 36, name: 'History' },
      { id: 27, name: 'Horror' },
      { id: 10402, name: 'Music' },
      { id: 9648, name: 'Mystery' },
      { id: 10749, name: 'Romance' },
      { id: 878, name: 'Science Fiction' },
      { id: 53, name: 'Thriller' },
      { id: 10752, name: 'War' },
      { id: 37, name: 'Western' },
      { id: 10770, name: 'TV Movie' },
    ]);
  }
}

export type DiscoverByGenresOptions = {
  sortBy?:
    | 'popularity.desc'
    | 'vote_average.desc'
    | 'release_date.desc'
    | 'revenue.desc'
    | 'vote_count.desc';
  voteCountGte?: number;
};

function offlineSortForDiscover(sortBy: string): OfflineDiscoverSort {
  if (sortBy === 'release_date.desc') return 'year';
  if (
    sortBy === 'vote_average.desc' ||
    sortBy === 'vote_count.desc' ||
    sortBy === 'revenue.desc'
  ) {
    return 'rating';
  }
  return 'default';
}

function voteCountFloorForDiscover(sortBy: string, explicit?: number): number | undefined {
  if (explicit != null && Number.isFinite(explicit)) return explicit;
  if (sortBy === 'vote_average.desc') return 250;
  if (sortBy === 'release_date.desc') return 80;
  if (sortBy === 'revenue.desc') return 100;
  return undefined;
}

export async function discoverByGenres(
  genreNames: string[],
  region = 'US',
  page = 1,
  limit = 50,
  opts?: DiscoverByGenresOptions
) {
  const sortBy = opts?.sortBy ?? 'popularity.desc';
  const primarySort: { sortBy: string; voteCountGte?: number } = {
    sortBy,
    voteCountGte: voteCountFloorForDiscover(sortBy, opts?.voteCountGte),
  };

  try {
    const genres = await tmdbClient.getMovieGenres();
    const ids = resolveDiscoverGenreIds(genreNames, genres);
    const discoverExtras = discoverExtrasForGenres(genreNames);
    const rows = await tmdbClient.discoverMovies(
      ids,
      region,
      page,
      limit,
      primarySort,
      primarySort,
      discoverExtras
    );
    const seen = new Set<number>();
    const unique = rows.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    return unique.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.releaseDate ? Number(m.releaseDate.slice(0, 4)) : undefined,
      rating: m.voteAverage ?? undefined,
      poster: resolveDiscoverPosterUrl(m.posterPath),
      providers: m.providers,
      genres: m.genreIds ?? [],
    }));
  } catch {
    return fallbackByGenres(genreNames, limit, offlineSortForDiscover(sortBy));
  }
}

export function addToWatchlist(userId: string, tmdbId: number): Promise<void> {
  return Promise.resolve(); // TODO
}

export function removeFromWatchlist(userId: string, tmdbId: number): Promise<void> {
  return Promise.resolve(); // TODO
}

export function getWatchlist(userId: string): Promise<WatchlistEntry[]> {
  return Promise.resolve([]); // TODO
}

export function markWatched(userId: string, dto: MarkWatchedBody): Promise<void> {
  return Promise.resolve(); // TODO
}

export function getRatings(userId: string): Promise<Rating[]> {
  return Promise.resolve([]); // TODO
}
