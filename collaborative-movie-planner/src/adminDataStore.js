/**
 * Admin-only mock persistence (localStorage). Replace with API when backend admin routes exist.
 * Keys align with DATABASE ENGINEER notes in server/prisma/schema.prisma.
 */
const BANNED_KEY = "mnp.admin.bannedUserNames";
const BANNED_IDS_KEY = "mnp.admin.bannedUserIds";
const CATALOG_KEY = "mnp.admin.catalogMovies";

/** Legacy name-only bans (older UI). Still honored in `isUserBannedForFriend`. */
export function readBannedNames() {
  try {
    const raw = localStorage.getItem(BANNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeBannedNames(names) {
  localStorage.setItem(BANNED_KEY, JSON.stringify(names));
}

export function readBannedIds() {
  try {
    const raw = localStorage.getItem(BANNED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeBannedIds(ids) {
  localStorage.setItem(BANNED_IDS_KEY, JSON.stringify(ids));
}

export function banUserById(rawId) {
  const id = String(rawId ?? "").trim();
  if (!id) return readBannedIds();
  const set = new Set(readBannedIds().map(String));
  set.add(id);
  const next = [...set];
  writeBannedIds(next);
  return next;
}

export function unbanUserById(rawId) {
  const id = String(rawId ?? "").trim();
  const next = readBannedIds().filter((x) => String(x) !== id);
  writeBannedIds(next);
  return next;
}

/** Friend row from search: hide if banned ID or legacy banned name. */
export function isUserBannedForFriend(friend) {
  const fid = String(friend?.id ?? "").trim();
  if (fid && readBannedIds().some((x) => String(x) === fid)) {
    return true;
  }
  const name = (friend?.displayName ?? "").trim();
  if (!name) return false;
  const lower = name.toLowerCase();
  return readBannedNames().some((x) => x.toLowerCase() === lower);
}

const DEFAULT_ADMIN_CATALOG = [
  {
    id: "ac-seed-1",
    title: "Catalog Seed: Neon Nights",
    year: 2025,
    genre: "Sci-Fi",
    posterStorageKey: "catalog-posters/demo/neon-nights.jpg",
    adminNotes: "Demo row for admin UI; resolve URL via POSTER_CDN_BASE_URL + key.",
    posterUrl: "https://via.placeholder.com/300x450/1a1a2e/e94560?text=NEON+NIGHTS",
  },
];

export function readAdminCatalogMovies() {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return DEFAULT_ADMIN_CATALOG;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ADMIN_CATALOG;
  } catch {
    return DEFAULT_ADMIN_CATALOG;
  }
}

export function writeAdminCatalogMovies(movies) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(movies));
}

export function addAdminCatalogMovie(entry) {
  const list = readAdminCatalogMovies();
  const id = `ac-${Date.now()}`;
  const posterUrl =
    entry.posterUrl ||
    (entry.posterStorageKey
      ? `https://via.placeholder.com/300x450/2a2a2a/e8c547?text=${encodeURIComponent(entry.title.slice(0, 12))}`
      : "https://via.placeholder.com/300x450/1a1a1a/888?text=NO+POSTER");
  const row = {
    id,
    title: entry.title.trim(),
    year: Number(entry.year) || new Date().getFullYear(),
    genre: (entry.genre || "").trim() || "General",
    posterStorageKey: (entry.posterStorageKey || "").trim(),
    adminNotes: (entry.adminNotes || "").trim(),
    posterUrl,
  };
  const next = [...list, row];
  writeAdminCatalogMovies(next);
  return next;
}
