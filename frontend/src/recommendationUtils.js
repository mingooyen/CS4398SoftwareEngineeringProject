import { readAdminCatalogMovies } from "./adminDataStore.js";
import { getGenrePreferencesForDisplayName } from "./authService.js";

function normalizeGenre(g) {
  return (g || "").trim().toLowerCase();
}

function genreMatches(movieGenre, memberGenres) {
  const mg = normalizeGenre(movieGenre);
  if (!mg) return false;
  for (const pref of memberGenres) {
    const p = normalizeGenre(pref);
    if (!p) continue;
    if (mg === p) return true;
    if (mg.includes(p) || p.includes(mg)) return true;
    const first = p.split(/[\s/-]+/)[0];
    if (first && mg.includes(first)) return true;
  }
  return false;
}

/**
 * Merges admin-added catalog titles with current recommendation cards and ranks by overlap with group members' genre preferences.
 */
export function computeGroupRecommendations(activeGroup, recommendationCards) {
  const members = activeGroup?.members ?? [];
  const memberGenres = new Set();
  for (const m of members) {
    getGenrePreferencesForDisplayName(m.name).forEach((g) => memberGenres.add(g));
  }
  const flatGenres = [...memberGenres].map(normalizeGenre).filter(Boolean);

  const fromAdmin = readAdminCatalogMovies().map((m) => ({
    id: `cat-${m.id}`,
    title: m.title,
    year: m.year,
    genre: m.genre,
    avgRating: 4.0,
    votes: 0,
    userVoted: false,
    poster: m.posterUrl,
    watched: false,
  }));

  const combined = [...fromAdmin, ...recommendationCards];
  const scored = combined.map((movie) => {
    let score = 0;
    if (flatGenres.length === 0) {
      score = 1;
    } else if (genreMatches(movie.genre, flatGenres)) {
      score = 3;
    }
    return { ...movie, _score: score };
  });
  scored.sort((a, b) => b._score - a._score || (b.avgRating || 0) - (a.avgRating || 0));
  return scored.map(({ _score, ...rest }) => rest);
}
