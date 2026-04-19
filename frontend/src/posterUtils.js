/** Placeholder when TMDB has no art or all image URLs fail. */
export function makePosterDataUri(title) {
  const raw = String(title || "MOVIE").replace(/[<>&"]/g, "");
  const fontSize = raw.length > 32 ? 12 : raw.length > 22 ? 14 : raw.length > 16 ? 16 : 18;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'><rect width='100%' height='100%' fill='#1a1a1a'/><text x='150' y='225' fill='#e8c547' font-family='Arial,sans-serif' font-size='${fontSize}' text-anchor='middle' dominant-baseline='middle' style='paint-order:stroke;stroke:#0d0d0d;stroke-width:3px'>${raw.slice(0, 48)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Try the next smaller TMDB still size (helps when w500 is missing or blocked).
 * @returns {string|null} next URL or null if no TMDB tier left
 */
export function nextSmallerTmdbPosterUrl(currentSrc) {
  if (!currentSrc || typeof currentSrc !== "string") return null;
  const m = currentSrc.match(/^(https:\/\/image\.tmdb\.org\/t\/p\/)([^/]+)(\/.+)$/i);
  if (!m) return null;
  const order = ["original", "w780", "w500", "w342", "w185"];
  const idx = order.findIndex((s) => s.toLowerCase() === m[2].toLowerCase());
  if (idx < 0 || idx >= order.length - 1) return null;
  return `${m[1]}${order[idx + 1]}${m[3]}`;
}

/** @param {string} title */
export function createPosterErrorHandler(title) {
  return (e) => {
    const next = nextSmallerTmdbPosterUrl(e.currentTarget.src);
    if (next && next !== e.currentTarget.src) {
      e.currentTarget.src = next;
      return;
    }
    e.currentTarget.src = makePosterDataUri(title);
  };
}
