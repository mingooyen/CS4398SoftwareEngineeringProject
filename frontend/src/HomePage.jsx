import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acceptInvite,
  acceptFriendRequest,
  areFriends,
  denyInvite,
  demoFriendPresence,
  denyFriendRequest,
  normalizeName,
  readFriendLinks,
  readFriendNotifications,
  readFriendRequests,
  readInvites,
  sendFriendRequest,
  writeFriendNotifications,
} from "./groupDataStore.js";
import { isUserBannedForFriend } from "./adminDataStore.js";
import { getStoredSession } from "./authService.js";
import { buildOfflineMovies } from "./offlineCatalog.js";
import { createPosterErrorHandler, makePosterDataUri } from "./posterUtils.js";

/** When the server cannot save (offline, DB down), keep stars from snapping back after refresh. Scoped per logged-in user. */
function ratingsBackupStorageKey() {
  const uid = getStoredSession()?.userId;
  return uid ? `mnp.ratings.backup.${uid}` : null;
}

function readLocalRatingBackup() {
  const key = ratingsBackupStorageKey();
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function writeLocalRatingBackup(map) {
  const key = ratingsBackupStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

function mergeOneLocalRating(idKey, score) {
  const next = { ...readLocalRatingBackup(), [idKey]: score };
  writeLocalRatingBackup(next);
}

function pendingRatingsStorageKey() {
  const uid = getStoredSession()?.userId;
  return uid ? `mnp.ratings.pending.${uid}` : null;
}

function readPendingRatings() {
  const key = pendingRatingsStorageKey();
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function writePendingRatings(map) {
  const key = pendingRatingsStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

function upsertPendingRating(idKey, score) {
  const next = { ...readPendingRatings(), [String(idKey)]: Number(score) };
  writePendingRatings(next);
}

function removePendingRating(idKey) {
  const next = { ...readPendingRatings() };
  delete next[String(idKey)];
  writePendingRatings(next);
}

async function flushPendingRatings(accessToken) {
  const pending = { ...readPendingRatings() };
  const entries = Object.entries(pending);
  if (!entries.length || !accessToken) return {};

  const synced = {};
  for (const [idKey, score] of entries) {
    try {
      const res = await fetch("http://localhost:3000/api/v1/movies/watched", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tmdbId: Number(idKey), rating: Number(score) }),
      });
      if (res.ok) {
        synced[idKey] = Number(score);
        delete pending[idKey];
        continue;
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        delete pending[idKey];
      }
    } catch {
      // Keep pending for next retry.
    }
  }
  writePendingRatings(pending);
  return synced;
}

/** Now Showing row: preset id → TMDB discover when no genre chip is selected. */
const HOME_BROWSE_PRESETS = [
  { id: "foryou", label: "For you" },
  { id: "trending", label: "Trending" },
  {
    id: "popular",
    label: "Popular ★",
    title: "Sorted by TMDB average rating with a minimum vote count so obscure one-vote titles are filtered out.",
  },
  { id: "newest", label: "New releases", title: "Newest premiere dates first (TMDB release date)." },
  {
    id: "boxoffice",
    label: "Top box office",
    title: "By reported worldwide revenue on TMDB when the database has figures for a title.",
  },
  { id: "mostvotes", label: "Most reviewed", title: "Titles with the largest number of TMDB user votes." },
];

const ACTIVITY_STATUS_KEY = "mnp.ui.activityStatus";
const MAX_NOTIFICATIONS_PER_SECTION = 5;
const ACTIVITY_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "away", label: "Away" },
  { value: "busy", label: "Busy" },
  { value: "invisible", label: "Invisible" },
];

function normalizeActivityStatus(value = "") {
  const next = String(value || "").toLowerCase();
  if (ACTIVITY_STATUS_OPTIONS.some((opt) => opt.value === next)) return next;
  return "active";
}

function readInitialActivityStatus() {
  try {
    const stored = String(localStorage.getItem(ACTIVITY_STATUS_KEY) || "");
    return normalizeActivityStatus(stored);
  } catch {
    // no-op: fall back to default
  }
  return "active";
}

function StarRating({ movieId, initialRating, onRate }) {
  const [hovered, setHovered] = useState(0);
  const activeRating = hovered || Number(initialRating) || 0;

  const commit = (score) => {
    if (!Number.isFinite(Number(score))) return;
    onRate(movieId, Number(score));
  };

  return (
    <div
      className="card-star-row"
      role="radiogroup"
      aria-label="Rate this movie"
      onMouseLeave={() => setHovered(0)}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={Number(initialRating) === star}
          onClick={(event) => {
            event.stopPropagation();
            setHovered(0);
            commit(star);
          }}
          onMouseEnter={() => setHovered(star)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            color: star <= activeRating ? "#f5c518" : "#444",
            transition: "color 0.15s, transform 0.1s",
            transform: star <= hovered ? "scale(1.2)" : "scale(1)",
            padding: "2px",
          }}
          aria-label={`Rate ${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function MovieCard({ movie, userRating, inWatchlist, onRate, onWatchlist, isAuthenticated, onLoginClick }) {
  const handleWatchlist = () => {
    if (!isAuthenticated) {
      onLoginClick();
      return;
    }
    onWatchlist(movie.id, !inWatchlist);
  };

  return (
    <div className="movie-card">
      <div className="card-poster-wrap">
        <img
          src={
            movie.poster ||
            makePosterDataUri(movie.title)
          }
          alt={movie.title}
          className="card-poster"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={createPosterErrorHandler(movie.title)}
        />
        <div className="card-overlay">
          <button
            type="button"
            onClick={handleWatchlist}
            className={`watchlist-btn ${inWatchlist ? "active" : ""}`}
          >
            {!isAuthenticated
              ? "Log in for watchlist"
              : inWatchlist
                ? "✓ Listed"
                : "+ Watchlist"}
          </button>
        </div>
      </div>
      <div className="card-info">
        <p className="card-year">{movie.year}</p>
        <h3 className="card-title">{movie.title}</h3>
        <p className="card-tmdb">
          <span className="tmdb-star">★</span> {movie.rating}
        </p>
        <p className="card-provider">
          {movie.providers?.length
            ? `Watch on: ${movie.providers.map((p) => p.providerName).slice(0, 3).join(", ")}`
            : "Watch providers unavailable"}
        </p>
        <div className="card-rating-section">
          <div className="card-divider" />
          <p className="rate-label">Your Rating</p>
          <div className="card-rating-row">
            {isAuthenticated ? (
              <StarRating movieId={movie.id} initialRating={userRating} onRate={onRate} />
            ) : (
              <button type="button" className="login-rate-btn" onClick={onLoginClick}>
                Log in to rate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── onNavigate prop added ──
export default function HomePage({
  onNavigate,
  onLogout,
  highlightedName = "",
  accessToken = "",
  isAuthenticated,
  isSystemAdmin = false,
  onOpenAdmin,
  homeNav,
  onHomeNavChange,
  adminTick = 0,
}) {
  const [query, setQuery] = useState("");
  const [ratings, setRatings] = useState({});
  const [watchlistIds, setWatchlistIds] = useState([]);
  const [groupInvites, setGroupInvites] = useState(() => readInvites());
  const [friendRequests, setFriendRequests] = useState(() => readFriendRequests());
  const [friendNotifications, setFriendNotifications] = useState(() => readFriendNotifications());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsRailOpen, setFriendsRailOpen] = useState(false);
  const [myActivityStatus, setMyActivityStatus] = useState(readInitialActivityStatus);
  const [friendsQuery, setFriendsQuery] = useState("");
  const [friendResults, setFriendResults] = useState([]);
  const friendsSearchAbortRef = useRef(null);
  const [movies, setMovies] = useState([]);
  const [browseGenres, setBrowseGenres] = useState([]);
  /** Logged-in user: `GET /users/me/preferences` → favoriteGenres */
  const [savedFavoriteGenres, setSavedFavoriteGenres] = useState([]);
  /** Genres removed from the For you mix (persisted); rating-inferred genres stay out until cleared. */
  const [savedExcludedGenres, setSavedExcludedGenres] = useState([]);
  const savedFavRef = useRef([]);
  const savedExclRef = useRef([]);
  /** Keep in sync every render so async handlers (tag click, rate) never read stale prefs before useEffect runs. */
  savedFavRef.current = savedFavoriteGenres;
  savedExclRef.current = savedExcludedGenres;
  /** Bumped on local preference writes so a slow initial GET cannot clobber optimistic updates (e.g. genre tags). */
  const prefsSyncGenRef = useRef(0);
  /** Latest TMDB genre id[] per movie id (ref only—avoid discover refetch loops). */
  const movieGenresByIdRef = useRef({});
  /** Latest ratings map so merge/discover can read current values without listing `ratings` on discover effect deps (every star tap was refetching movies and racing the save). */
  const ratingsRef = useRef(ratings);
  ratingsRef.current = ratings;
  /** Preset from HOME_BROWSE_PRESETS when no genre chip is selected */
  const [browsePreset, setBrowsePreset] = useState("foryou");
  /** When set, list is filtered to this TMDB genre name (Action, Drama, …). */
  const [selectedGenreName, setSelectedGenreName] = useState(null);
  /** Now Showing: first chunk, then +50 per "Show more" (up to loaded list length). */
  const HOME_PAGE_CHUNK = 50;
  const [homeVisibleCount, setHomeVisibleCount] = useState(HOME_PAGE_CHUNK);

  const isSelfFriend = (name = "") =>
    normalizeName(name) === normalizeName(highlightedName || "");

  const visibleInvites = groupInvites.filter(
    (invite) => normalizeName(invite.invitedUserName) === normalizeName(highlightedName || "")
  );
  const visibleFriendRequests = friendRequests.filter(
    (req) => normalizeName(req.targetUserName) === normalizeName(highlightedName || "")
  );
  const visibleFriendNotifications = friendNotifications.filter(
    (note) => normalizeName(note.userName) === normalizeName(highlightedName || "")
  );
  const displayedInvites = visibleInvites.slice(0, MAX_NOTIFICATIONS_PER_SECTION);
  const displayedFriendRequests = visibleFriendRequests.slice(0, MAX_NOTIFICATIONS_PER_SECTION);
  const displayedFriendNotifications = visibleFriendNotifications.slice(0, MAX_NOTIFICATIONS_PER_SECTION);
  const notificationBadgeCount = notificationsOpen
    ? 0
    : displayedInvites.length + displayedFriendRequests.length + displayedFriendNotifications.length;

  /** Server friends (Mongo friendships) with `isOnline` from presence JSON. */
  const [apiFriends, setApiFriends] = useState([]);

  const railFriendsList = useMemo(() => {
    const self = normalizeName(highlightedName || "");
    const fromApi = (apiFriends || []).map((f) => ({
      userId: String(f.userId || ""),
      displayName: f.displayName,
      isOnline: Boolean(f.isOnline),
      activityStatus: normalizeActivityStatus(f.activityStatus),
    }));
    const apiNames = new Set(fromApi.map((f) => normalizeName(f.displayName)));
    const fromLocal = self
        ? readFriendLinks()
            .filter((l) => normalizeName(l.userName) === self)
            .filter((l) => !apiNames.has(normalizeName(l.friendName || "")))
            .map((l) => {
              const presence = demoFriendPresence(l.friendName);
              return {
                userId: String(l.friendId || ""),
                displayName: l.friendName,
                isOnline: presence.isOnline,
                activityStatus: presence.activityStatus,
              };
            })
        : [];
    return [...fromApi, ...fromLocal].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [apiFriends, highlightedName, friendRequests]);

  const railOnlineCount = useMemo(
    () => railFriendsList.filter((f) => f.isOnline).length,
    [railFriendsList]
  );

  const navItems = isAuthenticated
    ? [
        "Home",
        "My Groups",
        "Watchlist",
        ...(isSystemAdmin ? ["Admin"] : []),
        "Logout",
      ]
    : ["Home", "My Groups", "Login", "Signup"];
  const showFriendsRail =
    isAuthenticated && homeNav !== "Logout" && homeNav !== "Signup";

  const sourceMovies =
    homeNav === "Watchlist"
      ? movies.filter((movie) => watchlistIds.includes(String(movie.id)))
      : movies;

  const filtered = sourceMovies.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()));

  const isHomeBrowse = homeNav === "Home" && !query.trim();
  const displayedMovies = isHomeBrowse
    ? filtered.slice(0, homeVisibleCount)
    : filtered;

  const handleRate = (movieId, score) => {
    const idKey = String(movieId);
    setRatings((prev) => ({ ...prev, [idKey]: score }));
    mergeOneLocalRating(idKey, score);
    upsertPendingRating(idKey, score);

    if (!isAuthenticated || !accessToken) return;

    void (async () => {
      try {
        const saveRes = await fetch("http://localhost:3000/api/v1/movies/watched", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tmdbId: Number(movieId), rating: Number(score) }),
        });
        if (!saveRes.ok) {
          // Local-first UX: keep rating locally and retry in background queue.
          return;
        }
        removePendingRating(idKey);

        if (Number(score) < 4) return;
        const movie = movies.find((m) => String(m.id) === idKey);
        const gids = movie?.genres;
        if (!Array.isArray(gids) || !gids.length || !browseGenres.length) return;
        const idToName = new Map(browseGenres.map((g) => [Number(g.id), g.name]));
        const names = [...new Set(gids.map((gid) => idToName.get(Number(gid))).filter(Boolean))];
        if (!names.length) return;

        const fav = savedFavRef.current;
        const seen = new Set(fav.map((x) => x.toLowerCase()));
        const nextFav = [...fav];
        let added = false;
        for (const nm of names) {
          const key = nm.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          nextFav.push(nm);
          added = true;
        }
        if (!added) return;

        const prefsRes = await fetch("http://localhost:3000/api/v1/users/me", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preferences: { favoriteGenres: nextFav },
          }),
        });
        if (!prefsRes.ok) return;
        prefsSyncGenRef.current += 1;
        savedFavRef.current = nextFav;
        setSavedFavoriteGenres(nextFav);
      } catch {
        // Leave optimistic + pending; sync effect will retry.
      }
    })();
  };

  const handleWatchlist = (movieId, added) => {
    const id = String(movieId);
    setWatchlistIds((prev) =>
      added ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)
    );

    // Database integration hook:
    // send { userId, movieId, status: "added" | "removed", updatedAt }.
    console.log(`Movie ${movieId} ${added ? "added to" : "removed from"} watchlist`);
  };

  // ── Routes nav clicks to the right page or tab ──
  const handleNavClick = (item) => {
    if (item === "My Groups" || item === "Groups") {
      onNavigate("group", { scrollToMyGroups: true });
    } else if (item === "Logout") {
      onLogout();
    } else if (item === "Login") {
      onNavigate("login");
    } else if (item === "Signup") {
      onNavigate("signup");
    } else if (item === "Admin") {
      onOpenAdmin?.();
    } else {
      onHomeNavChange(item);
    }
  };

  const goHomeRoot = () => {
    setBrowsePreset("foryou");
    setSelectedGenreName(null);
    onNavigate("home", { homeTab: "Home" });
  };
  const handleJoinInvite = (inviteId) => {
    acceptInvite(inviteId, highlightedName || "You");
    setGroupInvites(readInvites());
    onNavigate("group");
  };
  const handleDenyInvite = (inviteId) => {
    denyInvite(inviteId);
    setGroupInvites(readInvites());
  };
  const handleAcceptFriendRequest = (requestId) => {
    acceptFriendRequest(requestId);
    setFriendRequests(readFriendRequests());
    setFriendNotifications(readFriendNotifications());
  };
  const handleDenyFriendRequest = (requestId) => {
    denyFriendRequest(requestId);
    setFriendRequests(readFriendRequests());
  };
  const handleInviteFriend = (friend) => {
    if (!highlightedName || normalizeName(friend.displayName) === normalizeName(highlightedName)) {
      return;
    }
    sendFriendRequest(highlightedName || "You", `self-${normalizeName(highlightedName || "you")}`, friend.displayName, String(friend.id));
    setFriendRequests(readFriendRequests());
    setFriendNotifications(readFriendNotifications());
  };
  const dismissFriendNotification = (notificationId) => {
    const next = friendNotifications.filter((note) => note.id !== notificationId);
    writeFriendNotifications(next);
    setFriendNotifications(next);
  };
  useEffect(() => {
    setGroupInvites(readInvites());
    setFriendRequests(readFriendRequests());
    setFriendNotifications(readFriendNotifications());
  }, [highlightedName]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setApiFriends([]);
      return;
    }
    const loadFriends = () => {
      fetch("http://localhost:3000/api/v1/users/friends", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (Array.isArray(payload?.friends)) setApiFriends(payload.friends);
          else setApiFriends([]);
        })
        .catch(() => setApiFriends([]));
    };
    loadFriends();
    const id = setInterval(loadFriends, 12000);
    return () => clearInterval(id);
  }, [isAuthenticated, accessToken, friendRequests, friendsRailOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVITY_STATUS_KEY, myActivityStatus);
    } catch {
      // ignore localStorage failures
    }
  }, [myActivityStatus]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (myActivityStatus === "invisible") return;
    const ping = () => {
      fetch("http://localhost:3000/api/v1/users/me/presence", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 25000);
    return () => clearInterval(id);
  }, [isAuthenticated, accessToken, myActivityStatus]);

  useEffect(() => {
    if (!isAuthenticated && homeNav === "Watchlist") {
      onHomeNavChange("Home");
    }
  }, [isAuthenticated, homeNav, onHomeNavChange]);
  const runFriendsSearch = useCallback(() => {
    if (!accessToken) {
      setFriendResults([]);
      return;
    }
    const q = friendsQuery.trim();
    if (!q) {
      setFriendResults([]);
      return;
    }

    friendsSearchAbortRef.current?.abort();
    const ac = new AbortController();
    friendsSearchAbortRef.current = ac;

    fetch(
      `http://localhost:3000/api/v1/users/search?q=${encodeURIComponent(q)}&limit=25`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: ac.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (ac.signal.aborted) return;
        if (Array.isArray(payload?.users)) {
          const apiUsers = payload.users
            .map((user) => ({
              id: String(user.id),
              displayName: user.displayName,
              numericId:
                user.numericId != null && Number.isFinite(Number(user.numericId))
                  ? Number(user.numericId)
                  : null,
              source: "Directory",
            }))
            .filter(
              (user) => !isSelfFriend(user.displayName) && !isUserBannedForFriend(user)
            );
          setFriendResults(apiUsers);
        } else {
          setFriendResults([]);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
      });
  }, [friendsQuery, accessToken, highlightedName]);

  useEffect(() => {
    if (!friendsOpen) {
      friendsSearchAbortRef.current?.abort();
      friendsSearchAbortRef.current = null;
      setFriendResults([]);
    }
  }, [friendsOpen]);

  useEffect(() => {
    fetch("http://localhost:3000/api/v1/movies/genres")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (Array.isArray(payload?.genres) && payload.genres.length > 0) {
          setBrowseGenres(payload.genres);
        }
      })
      .catch(() => {});
  }, []);

  const pullPreferencesIfStillCurrent = useCallback(
    (capturedGen) => {
      if (!accessToken) return;
      fetch("http://localhost:3000/api/v1/users/me/preferences", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (capturedGen !== prefsSyncGenRef.current) return;
          const g = payload?.preferences?.favoriteGenres;
          const x = payload?.preferences?.forYouExcludedGenres;
          const activity = normalizeActivityStatus(payload?.preferences?.activityStatus);
          setSavedFavoriteGenres(Array.isArray(g) ? g.filter(Boolean) : []);
          setSavedExcludedGenres(Array.isArray(x) ? x.filter(Boolean) : []);
          setMyActivityStatus(activity);
        })
        .catch(() => {
          if (capturedGen !== prefsSyncGenRef.current) return;
          setSavedFavoriteGenres([]);
          setSavedExcludedGenres([]);
          setMyActivityStatus("active");
        });
    },
    [accessToken]
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      prefsSyncGenRef.current = 0;
      setSavedFavoriteGenres([]);
      setSavedExcludedGenres([]);
      return;
    }
    const genAtStart = prefsSyncGenRef.current;
    pullPreferencesIfStillCurrent(genAtStart);
  }, [isAuthenticated, accessToken, pullPreferencesIfStillCurrent]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setRatings({});
      return;
    }
    fetch("http://localhost:3000/api/v1/movies/ratings", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const api = payload?.ratings && typeof payload.ratings === "object" ? payload.ratings : {};
        const merged = { ...api, ...readLocalRatingBackup() };
        setRatings(merged);
        writeLocalRatingBackup(merged);
      })
      .catch(() => {
        setRatings(readLocalRatingBackup());
      });
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    let cancelled = false;

    const syncPending = () => {
      void flushPendingRatings(accessToken).then((synced) => {
        if (cancelled) return;
        const keys = Object.keys(synced);
        if (!keys.length) return;
        setRatings((prev) => {
          const next = { ...prev, ...synced };
          writeLocalRatingBackup(next);
          return next;
        });
      });
    };

    syncPending();
    const intervalId = window.setInterval(syncPending, 4000);
    window.addEventListener("online", syncPending);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", syncPending);
    };
  }, [isAuthenticated, accessToken]);

  const mergeForYouGenreNames = useCallback((idLookup) => {
    if (!isAuthenticated) return [];
    const idToName = new Map(browseGenres.map((g) => [Number(g.id), g.name]));
    const excluded = new Set(
      (savedExcludedGenres || []).map((s) => String(s || "").trim().toLowerCase()).filter(Boolean)
    );
    const fromPrefs = (savedFavoriteGenres || []).filter(Boolean);
    const merged = [...fromPrefs];
    const seen = new Set(merged.map((x) => String(x || "").trim().toLowerCase()));
    for (const [movieId, score] of Object.entries(ratingsRef.current)) {
      if (Number(score) < 4) continue;
      const gids = idLookup(String(movieId));
      if (!Array.isArray(gids)) continue;
      for (const gid of gids) {
        const name = idToName.get(Number(gid));
        if (!name) continue;
        const k = String(name).trim().toLowerCase();
        if (excluded.has(k)) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(String(name).trim());
      }
    }
    return merged.filter((g) => !excluded.has(String(g || "").trim().toLowerCase()));
  }, [isAuthenticated, browseGenres, savedFavoriteGenres, savedExcludedGenres]);

  /** Only 4★+ rows affect For you discover genres — avoids refetching the grid on every 1–3★ tap. */
  const forYouRatingsDigest = useMemo(() => {
    return Object.entries(ratings)
      .filter(([, s]) => Number(s) >= 4)
      .map(([id, s]) => `${id}:${Number(s)}`)
      .sort()
      .join("|");
  }, [ratings]);

  const forYouTasteLabels = useMemo(
    () =>
      mergeForYouGenreNames(
        (movieId) =>
          movieGenresByIdRef.current[String(movieId)] ??
          movies.find((x) => String(x.id) === String(movieId))?.genres
      ),
    [mergeForYouGenreNames, movies, forYouRatingsDigest]
  );

  const addForYouGenreFromTag = useCallback(
    async (name) => {
      const cleanName = String(name || "").trim();
      if (!cleanName || !accessToken) return;
      const key = cleanName.toLowerCase();
      const prevFav = [...savedFavRef.current];
      const prevExcl = [...savedExclRef.current];
      const nextFav = prevFav.some((g) => g.toLowerCase() === key) ? [...prevFav] : [...prevFav, cleanName];
      const nextExcl = prevExcl.filter((g) => g.toLowerCase() !== key);
      const changed =
        nextFav.length !== prevFav.length || nextExcl.length !== prevExcl.length;
      if (!changed) return;
      prefsSyncGenRef.current += 1;
      savedFavRef.current = nextFav;
      savedExclRef.current = nextExcl;
      setSavedFavoriteGenres(nextFav);
      setSavedExcludedGenres(nextExcl);
      try {
        const res = await fetch("http://localhost:3000/api/v1/users/me", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preferences: { favoriteGenres: nextFav, forYouExcludedGenres: nextExcl },
          }),
        });
        if (!res.ok) {
          savedFavRef.current = prevFav;
          savedExclRef.current = prevExcl;
          setSavedFavoriteGenres(prevFav);
          setSavedExcludedGenres(prevExcl);
        }
      } catch {
        savedFavRef.current = prevFav;
        savedExclRef.current = prevExcl;
        setSavedFavoriteGenres(prevFav);
        setSavedExcludedGenres(prevExcl);
      }
    },
    [accessToken]
  );

  const addForYouGenreFromTag = useCallback(
    async (name) => {
      const cleanName = String(name || "").trim();
      if (!cleanName || !accessToken) return;
      const key = cleanName.toLowerCase();
      const prevFav = savedFavRef.current;
      const prevExcl = savedExclRef.current;
      const nextFav = prevFav.some((g) => g.toLowerCase() === key) ? [...prevFav] : [...prevFav, cleanName];
      const nextExcl = prevExcl.filter((g) => g.toLowerCase() !== key);
      const changed =
        nextFav.length !== prevFav.length || nextExcl.length !== prevExcl.length;
      if (!changed) return;
      setSavedFavoriteGenres(nextFav);
      setSavedExcludedGenres(nextExcl);
      try {
        const res = await fetch("http://localhost:3000/api/v1/users/me", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preferences: { favoriteGenres: nextFav, forYouExcludedGenres: nextExcl },
          }),
        });
        if (!res.ok) {
          setSavedFavoriteGenres(prevFav);
          setSavedExcludedGenres(prevExcl);
        }
      } catch {
        setSavedFavoriteGenres(prevFav);
        setSavedExcludedGenres(prevExcl);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    setHomeVisibleCount(HOME_PAGE_CHUNK);
  }, [homeNav, browsePreset, selectedGenreName, highlightedName, query]);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    let browseNames = [];
    let sortBy = null;
    if (homeNav === "Home") {
      if (browsePreset === "foryou") {
        browseNames = mergeForYouGenreNames((id) => movieGenresByIdRef.current[id]);
        if (!browseNames.length) sortBy = "popularity.desc";
      } else {
        if (browsePreset === "trending") sortBy = "popularity.desc";
        else if (browsePreset === "popular") sortBy = "vote_average.desc";
        else if (browsePreset === "newest") sortBy = "release_date.desc";
        else if (browsePreset === "boxoffice") sortBy = "revenue.desc";
        else if (browsePreset === "mostvotes") sortBy = "vote_count.desc";
      }
      if (selectedGenreName) {
        browseNames = [selectedGenreName];
      }
    }

    const q = new URLSearchParams();
    if (browseNames.length) q.set("genres", browseNames.join(","));
    q.set("region", "US");
    const fetchLimit = homeNav === "Home" ? 150 : 50;
    q.set("limit", String(fetchLimit));
    if (sortBy) {
      q.set("sortBy", sortBy);
      if (sortBy === "vote_average.desc") q.set("voteCountGte", "300");
    }

    let offlineSort = "default";
    if (!selectedGenreName) {
      if (browsePreset === "popular") offlineSort = "rating";
      else if (browsePreset === "newest") offlineSort = "year";
      else if (browsePreset === "mostvotes" || browsePreset === "boxoffice") offlineSort = "rating";
    }

    const applyMovieMeta = (list) => {
      const next = { ...movieGenresByIdRef.current };
      for (const m of list) {
        next[String(m.id)] = Array.isArray(m.genres) ? m.genres : [];
      }
      movieGenresByIdRef.current = next;
    };

    fetch(`http://localhost:3000/api/v1/movies/discover?${q.toString()}`, { signal })
      .then((res) => {
        if (signal.aborted) return null;
        return res.ok ? res.json() : null;
      })
      .then((payload) => {
        if (signal.aborted) return;
        const raw = Array.isArray(payload?.movies) ? payload.movies : [];
        const dedup = [];
        const seen = new Set();
        for (const m of raw) {
          const k = String(m.id);
          if (seen.has(k)) continue;
          seen.add(k);
          dedup.push(m);
        }
        if (dedup.length) {
          applyMovieMeta(dedup);
          setMovies(dedup);
        } else {
          const offlineList = buildOfflineMovies(browseNames, fetchLimit, offlineSort);
          applyMovieMeta(offlineList);
          setMovies(offlineList);
        }
      })
      .catch((err) => {
        if (signal.aborted || err?.name === "AbortError") return;
        const offlineList = buildOfflineMovies(browseNames, fetchLimit, offlineSort);
        applyMovieMeta(offlineList);
        setMovies(offlineList);
      });

    return () => ac.abort();
  }, [
    mergeForYouGenreNames,
    isAuthenticated,
    savedFavoriteGenres,
    savedExcludedGenres,
    forYouRatingsDigest,
    browseGenres,
    homeNav,
    browsePreset,
    selectedGenreName,
  ]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0d0d;
          color: #f0ece4;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        .nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(13,13,13,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #1e1e1e;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 64px;
        }
        .nav.nav--with-friends-rail {
          padding-right: 96px;
        }
        .nav-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 2px;
          color: #e8c547;
        }
        .nav-logo span { color: #f0ece4; }
        .nav-left {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
        }
        .notif-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #2e2e2e;
          background: #141414;
          color: #d2d2d2;
          cursor: pointer;
          position: relative;
          font-size: 16px;
        }
        .notif-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #e74c3c;
          color: #fff;
          border: 2px solid #0d0d0d;
          font-size: 10px;
          line-height: 14px;
          text-align: center;
          padding: 0 3px;
        }
        .notif-panel {
          position: absolute;
          top: 44px;
          left: 0;
          width: min(420px, calc(100vw - 40px));
          max-height: min(75vh, 560px);
          overflow-y: auto;
          background: #121212;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          box-shadow: 0 18px 40px rgba(0,0,0,0.45);
          padding: 12px;
          z-index: 120;
        }
        .notif-title { font-size: 12px; color: #8f8f8f; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .notif-empty { font-size: 13px; color: #666; padding: 6px 2px; }
        .notif-item {
          border: 1px solid #232323;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
          background: #111;
        }
        .notif-item:last-child { margin-bottom: 0; }
        .notif-main { font-size: 13px; color: #e4e4e4; }
        .notif-sub { font-size: 11px; color: #7a7a7a; }
        .notif-actions { display: flex; gap: 6px; }
        .notif-approve, .notif-deny {
          padding: 6px 9px;
          border-radius: 7px;
          font-size: 11px;
          cursor: pointer;
          border: 1px solid transparent;
          background: transparent;
        }
        .notif-approve { border-color: #2f6f95; color: #9fd4ff; }
        .notif-deny { border-color: #6a2e2e; color: #ff9d9d; }
        .nav-links {
          display: flex;
          gap: 8px;
          align-items: center;
          flex: 1;
          min-width: 0;
          justify-content: flex-end;
          overflow-x: auto;
          overflow-y: hidden;
          flex-wrap: nowrap;
          scrollbar-width: thin;
        }
        .nav-links .nav-link {
          flex-shrink: 0;
          white-space: nowrap;
        }
        .friend-card {
          background: #121212;
          border: 1px solid #232323;
          border-radius: 10px;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
        }
        .friend-meta {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
          grid-column: 1;
        }
        .friend-meta-text { min-width: 0; }
        .friend-card .avatar,
        .friends-rail-row .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1e1e1e;
          border: 1px solid #2e2e2e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 600;
          color: #c5c5c5;
          flex-shrink: 0;
        }
        .friend-name { color: #f0ece4; font-size: 14px; }
        .friend-source { color: #8a8a8a; font-size: 11px; word-break: break-word; }
        .friend-invite-btn {
          grid-column: 2;
          justify-self: end;
          border: 1px solid #2f6f95;
          color: #9fd4ff;
          background: transparent;
          border-radius: 8px;
          padding: 10px 18px;
          min-height: 42px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .friends-results {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .friend-invite-btn:disabled {
          border-color: #3a3a3a;
          color: #8a8a8a;
          cursor: default;
        }
        .friends-overlay {
          position: fixed;
          inset: 0;
          z-index: 180;
          background: rgba(0,0,0,0.55);
          display: grid;
          place-items: center;
          padding: 20px;
        }
        .friends-panel {
          width: min(720px, 100%);
          max-height: 78vh;
          overflow: auto;
          background: #121212;
          border: 1px solid #2a2a2a;
          border-radius: 14px;
          padding: 16px;
        }
        .friends-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .friends-title { font-size: 18px; color: #f0ece4; }
        .friends-close {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #343434;
          background: #1a1a1a;
          color: #bbb;
          cursor: pointer;
        }
        .friends-search-row {
          display: flex;
          align-items: stretch;
          gap: 10px;
          margin-bottom: 12px;
        }
        .friends-search {
          flex: 1;
          min-width: 0;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #f0ece4;
          font-size: 14px;
          padding: 10px 12px;
        }
        .friends-search-btn {
          flex-shrink: 0;
          padding: 0 20px;
          border-radius: 8px;
          border: 1px solid #e8c547;
          background: rgba(232, 197, 71, 0.12);
          color: #e8c547;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .friends-search-btn:hover:not(:disabled) {
          background: rgba(232, 197, 71, 0.2);
        }
        .friends-search-btn:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .home-page-body {
          transition: padding-right 0.28s ease;
        }
        .home-page-body.has-friends-rail {
          padding-right: 50px;
        }
        .home-page-body.has-friends-rail.rail-open {
          padding-right: min(330px, calc(100vw - 24px));
        }
        .friends-rail {
          position: fixed;
          top: 64px;
          right: 0;
          bottom: 0;
          z-index: 110;
          display: flex;
          flex-direction: row-reverse;
          pointer-events: none;
        }
        .friends-rail > * {
          pointer-events: auto;
        }
        .friends-rail-handle {
          position: relative;
          z-index: 2;
          width: 50px;
          flex-shrink: 0;
          border: none;
          border-left: 1px solid #2a2a2a;
          background: linear-gradient(180deg, #1c1c1c 0%, #141414 100%);
          color: #e8c547;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 10px 3px;
          box-shadow: -6px 0 18px rgba(0,0,0,0.35);
        }
        .friends-rail-handle-icon-wrap {
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e8c547;
        }
        .friends-rail-handle-svg {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }
        .friends-rail-handle-badge {
          position: absolute;
          top: -2px;
          right: -6px;
          min-width: 15px;
          height: 15px;
          padding: 0 3px;
          border-radius: 999px;
          background: #2a2a2a;
          color: #888;
          font-size: 8px;
          font-weight: 700;
          line-height: 15px;
          text-align: center;
          border: 1px solid #3a3a3a;
        }
        .friends-rail-handle-badge.lit {
          background: #153524;
          color: #8ef0b0;
          border-color: #2ecc71;
        }
        .friends-rail-handle-active-line {
          font-size: 9px;
          font-weight: 600;
          color: #666;
          letter-spacing: 0.02em;
        }
        .friends-rail-handle-active-line.on {
          color: #6ee7a8;
        }
        .friends-rail-handle-chev {
          font-size: 14px;
          color: #aaa;
        }
        .friends-rail-handle:hover {
          background: linear-gradient(180deg, #242424 0%, #1a1a1a 100%);
        }
        .friends-rail-panel {
          width: min(280px, calc(100vw - 50px));
          background: #121212;
          border-left: 1px solid #2a2a2a;
          box-shadow: -12px 0 32px rgba(0,0,0,0.45);
          transform: translateX(100%);
          transition: transform 0.28s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          pointer-events: none;
          z-index: 0;
        }
        .friends-rail.open .friends-rail-panel {
          transform: translateX(0);
          pointer-events: auto;
        }
        .friends-rail-head {
          padding: 14px 16px 10px;
          border-bottom: 1px solid #232323;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .friends-rail-head-titles {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .friends-rail-title {
          font-size: 15px;
          font-weight: 600;
          color: #f0ece4;
        }
        .friends-rail-sub {
          font-size: 11px;
          color: #6ee7a8;
          font-weight: 500;
        }
        .friends-rail-sub.muted {
          color: #666;
        }
        .friends-rail-count {
          font-size: 11px;
          color: #888;
          background: #1a1a1a;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .friends-activity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px 12px;
          border-bottom: 1px solid #232323;
        }
        .friends-activity-label {
          font-size: 11px;
          color: #8b8b8b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          flex-shrink: 0;
        }
        .friends-activity-select {
          width: 100%;
          max-width: 170px;
          background: #171717;
          border: 1px solid #2d2d2d;
          color: #f0ece4;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          font-family: inherit;
        }
        .friends-activity-select.active { color: #6ee7a8; border-color: #2ecc71; }
        .friends-activity-select.away { color: #f1c40f; border-color: #b7950b; }
        .friends-activity-select.busy { color: #ff9d9d; border-color: #c0392b; }
        .friends-activity-select.invisible { color: #9a9a9a; border-color: #4a4a4a; }
        .friends-rail-list {
          overflow-y: auto;
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .friends-rail-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #161616;
          border: 1px solid #252525;
          border-radius: 10px;
        }
        .friends-rail-online {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4a4a4a;
          flex-shrink: 0;
        }
        .friends-rail-online.on {
          background: #2ecc71;
          box-shadow: 0 0 8px rgba(46, 204, 113, 0.45);
        }
        .friends-rail-online.away {
          background: #f1c40f;
          box-shadow: 0 0 8px rgba(241, 196, 15, 0.4);
        }
        .friends-rail-online.busy {
          background: #e74c3c;
          box-shadow: 0 0 8px rgba(231, 76, 60, 0.4);
        }
        .friends-rail-online.invisible {
          background: #4a4a4a;
          box-shadow: none;
        }
        .friends-rail-name {
          font-size: 14px;
          color: #f0ece4;
          font-weight: 500;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .friends-rail-empty {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          padding: 8px 4px;
        }
        .nav-link {
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #888;
          padding: 8px 16px;
          border-radius: 6px;
          transition: color 0.2s, background 0.2s;
          letter-spacing: 0.5px;
        }
        .nav-link:hover { color: #f0ece4; background: #1a1a1a; }
        .nav-link--current {
          color: #e8c547;
          background: rgba(232, 197, 71, 0.08);
        }
        .nav-link:focus {
          outline: none;
        }
        .nav-link:focus-visible {
          outline: 2px solid #e8c547;
          outline-offset: 2px;
        }

        .friends-find-in-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: calc(100% - 24px);
          margin: 0 12px 12px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e8c547;
          background: rgba(232, 197, 71, 0.1);
          color: #e8c547;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s, border-color 0.15s;
        }
        .friends-find-in-panel:hover {
          background: rgba(232, 197, 71, 0.18);
          border-color: #f0dc7a;
        }
        .friends-find-in-panel svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .hero {
          padding: 72px 40px 48px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(232,197,71,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(52px, 8vw, 96px);
          line-height: 0.95;
          letter-spacing: 3px;
          color: #f0ece4;
          margin-bottom: 12px;
        }
        .hero-title em {
          font-style: normal;
          color: #e8c547;
        }
        .hero-sub {
          font-size: 15px;
          color: #666;
          margin-bottom: 36px;
          font-weight: 300;
        }

        .search-wrap {
          max-width: 560px;
          margin: 0 auto;
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #555;
          font-size: 16px;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 16px 20px 16px 48px;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          color: #f0ece4;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-input::placeholder { color: #444; }
        .search-input:focus {
          border-color: #e8c547;
          box-shadow: 0 0 0 3px rgba(232,197,71,0.08);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          margin-bottom: 28px;
        }
        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 2px;
          color: #f0ece4;
        }
        .result-count { font-size: 13px; color: #555; }
        .genre-chip-head-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 6px;
        }
        .genre-chip-head-row .genre-chip-hint {
          width: auto;
          flex: 1;
          min-width: 0;
          margin-bottom: 0;
        }
        .result-count--genre-corner {
          flex-shrink: 0;
          text-align: right;
          white-space: nowrap;
          font-size: 12px;
          color: #7a7a7a;
          font-weight: 500;
          letter-spacing: 0.02em;
          padding-bottom: 1px;
        }

        .now-filters-wrap {
          padding: 0 40px 16px;
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .now-filter-tabs {
          display: flex;
          flex-wrap: nowrap;
          gap: 8px;
          margin-bottom: 12px;
          overflow-x: auto;
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
          scrollbar-color: #3a3a3a #141414;
        }
        .now-filter-tab {
          flex-shrink: 0;
          border: 1px solid #2e2e2e;
          background: #141414;
          color: #9a9a9a;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .now-filter-tab:hover {
          border-color: #444;
          color: #f0ece4;
        }
        .now-filter-tab.active {
          border-color: #e8c547;
          color: #e8c547;
          background: rgba(232,197,71,0.08);
        }
        .foryou-meta {
          margin-bottom: 12px;
          position: relative;
          z-index: 3;
        }
        .foryou-meta.foryou-meta--below {
          margin-top: 28px;
          margin-bottom: 40px;
          padding: 0 40px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .foryou-inline-count {
          font-size: 12px;
          color: #7a7a7a;
          margin: 0 0 10px;
          text-align: right;
        }
        .foryou-guest-hint {
          font-size: 13px;
          color: #9a9a9a;
          line-height: 1.45;
          max-width: 720px;
        }
        .foryou-login-link {
          background: none;
          border: none;
          color: #e8c547;
          cursor: pointer;
          text-decoration: underline;
          font: inherit;
          padding: 0;
        }
        .foryou-login-link:hover {
          color: #f5dc7a;
        }
        .foryou-taste-line {
          font-size: 13px;
          color: #b8b8b8;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          line-height: 1.5;
        }
        .foryou-taste-muted {
          color: #777;
        }
        .foryou-taste-label {
          color: #888;
          margin-right: 4px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 11px;
        }
        .foryou-taste-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px 4px 10px;
          border-radius: 999px;
          border: 1px solid #3a3a3a;
          background: #161616;
          color: #e8c547;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          touch-action: manipulation;
          position: relative;
          z-index: 1;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .foryou-taste-chip:hover {
          border-color: #8b4a4a;
          color: #ffbdbd;
          background: #1f1414;
        }
        .foryou-taste-chip-x {
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          opacity: 0.75;
        }
        .foryou-taste-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #3a3a3a;
          background: #161616;
          color: #c5a03a;
          font-size: 12px;
          font-family: inherit;
        }
        .genre-chip-row {
          display: flex;
          flex-wrap: nowrap;
          gap: 8px;
          align-items: center;
          overflow-x: auto;
          padding-bottom: 8px;
          margin: 0 -4px;
          padding-left: 4px;
          padding-right: 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-color: #3a3a3a #141414;
        }
        .genre-chip-hint {
          font-size: 12px;
          color: #666;
          width: 100%;
          margin-bottom: 8px;
        }
        .genre-pill {
          flex-shrink: 0;
          border: 1px solid #2e2e2e;
          background: #141414;
          color: #c5c5c5;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          touch-action: manipulation;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .genre-pill:hover {
          border-color: #e8c547;
          color: #f0ece4;
        }
        .genre-pill.active {
          border-color: #e8c547;
          background: rgba(232,197,71,0.1);
          color: #e8c547;
        }

        .expand-wrap {
          display: flex;
          justify-content: center;
          padding: 8px 40px 48px;
        }
        .expand-btn {
          border: 1px solid #3a3a3a;
          background: #161616;
          color: #e8c547;
          border-radius: 10px;
          padding: 12px 22px;
          font-size: 14px;
          cursor: pointer;
        }
        .expand-btn:hover {
          border-color: #e8c547;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 24px;
          padding: 0 40px 80px;
          align-items: stretch;
        }

        .movie-card {
          background: #111;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #1e1e1e;
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .movie-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          border-color: #2e2e2e;
        }

        .card-poster-wrap {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }
        .card-poster {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s;
        }
        .movie-card:hover .card-poster { transform: scale(1.04); }

        .card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%);
          display: flex;
          align-items: flex-end;
          padding: 16px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s;
        }
        .movie-card:hover .card-overlay {
          opacity: 1;
          pointer-events: auto;
        }

        .watchlist-btn {
          width: 100%;
          padding: 8px;
          background: rgba(232,197,71,0.9);
          color: #0d0d0d;
          border: none;
          border-radius: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .watchlist-btn.active { background: rgba(255,255,255,0.9); }
        .watchlist-btn:hover { background: #e8c547; }

        .card-info {
          padding: 14px 14px 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .card-year { font-size: 11px; color: #555; letter-spacing: 1px; margin-bottom: 4px; }
        .card-title {
          font-size: 15px;
          font-weight: 500;
          color: #f0ece4;
          margin-bottom: 6px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-tmdb { font-size: 13px; color: #888; margin-bottom: 2px; }
        .card-provider { font-size: 11px; color: #6f6f6f; min-height: 28px; margin-bottom: 4px; }
        .tmdb-star { color: #f5c518; }
        .card-rating-section {
          margin-top: auto;
        }
        .card-divider { height: 1px; background: #1e1e1e; margin: 12px 0 10px; }
        .rate-label { font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; text-align: center; }
        .card-rating-row {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-star-row {
          display: flex;
          gap: 2px;
          justify-content: center;
          align-items: center;
          min-height: 34px;
        }
        .login-rate-btn {
          width: 100%;
          min-height: 34px;
          padding: 6px 8px;
          box-sizing: border-box;
          border: 1px solid #2f6f95;
          border-radius: 8px;
          background: transparent;
          color: #9fd4ff;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1.2;
        }

        .empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          color: #444;
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty p { font-size: 16px; }

        @media (max-width: 600px) {
          .nav { padding: 0 20px; }
          .nav.nav--with-friends-rail {
            padding-right: 76px;
          }
          .hero { padding: 48px 20px 36px; }
          .grid { padding: 0 20px 60px; }
          .section-header { padding: 0 20px; }
          .genre-chip-head-row {
            flex-wrap: wrap;
          }
          .result-count--genre-corner {
            width: 100%;
            text-align: right;
          }
          .now-filters-wrap { padding: 0 20px 14px; }
          .foryou-meta.foryou-meta--below {
            padding-left: 20px;
            padding-right: 20px;
          }
          .expand-wrap { padding: 8px 20px 40px; }
        }
      `}</style>

      {/* NAV */}
      <nav className={`nav${showFriendsRail ? " nav--with-friends-rail" : ""}`}>
        <div className="nav-left">
          <button
            type="button"
            className="notif-btn"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((prev) => !prev)}
          >
            🔔
            {notificationBadgeCount > 0 ? (
              <span className="notif-badge">
                {notificationBadgeCount}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div className="notif-panel">
              <p className="notif-title">Group Invites</p>
              {visibleInvites.length === 0 ? (
                <p className="notif-empty">No pending invites for you.</p>
              ) : (
                displayedInvites.map((invite) => (
                  <div key={invite.id} className="notif-item">
                    <div>
                      <p className="notif-main">You are invited to join</p>
                      <p className="notif-sub">{invite.groupName} - Invited by {invite.inviterName}</p>
                    </div>
                    <div className="notif-actions">
                      <button className="notif-approve" type="button" onClick={() => handleJoinInvite(invite.id)}>Join</button>
                      <button className="notif-deny" type="button" onClick={() => handleDenyInvite(invite.id)}>Deny</button>
                    </div>
                  </div>
                ))
              )}
              <p className="notif-title" style={{ marginTop: "12px" }}>Friend Requests</p>
              {visibleFriendRequests.length === 0 ? (
                <p className="notif-empty">No friend requests.</p>
              ) : (
                displayedFriendRequests.map((req) => (
                  <div key={req.id} className="notif-item">
                    <div>
                      <p className="notif-main">{req.requesterName} sent you a friend request</p>
                      <p className="notif-sub">Requester ID: {req.requesterId}</p>
                    </div>
                    <div className="notif-actions">
                      <button
                        className="notif-approve"
                        type="button"
                        onClick={() => handleAcceptFriendRequest(req.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="notif-deny"
                        type="button"
                        onClick={() => handleDenyFriendRequest(req.id)}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))
              )}
              <p className="notif-title" style={{ marginTop: "12px" }}>Friend Alerts</p>
              {visibleFriendNotifications.length === 0 ? (
                <p className="notif-empty">No friend alerts.</p>
              ) : (
                displayedFriendNotifications.map((note) => (
                  <div key={note.id} className="notif-item">
                    <div>
                      <p className="notif-main">{note.message}</p>
                    </div>
                    <div className="notif-actions">
                      <button
                        className="notif-deny"
                        type="button"
                        onClick={() => dismissFriendNotification(note.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
          <button
            type="button"
            className="nav-logo"
            onClick={goHomeRoot}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "inherit",
              padding: 0,
              textAlign: "inherit",
            }}
          >
            MOVIE<span>NIGHT</span>
          </button>
        </div>
        <div className="nav-links">
          {navItems.map((item) => {
            const isCurrent = item !== "Admin" && item !== "Logout" && homeNav === item;
            return (
              <button
                key={item}
                type="button"
                className={`nav-link${isCurrent ? " nav-link--current" : ""}`}
                aria-current={isCurrent ? "page" : undefined}
                onMouseDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                }}
                onClick={() => handleNavClick(item)}
              >
                {item}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        className={`home-page-body${showFriendsRail ? " has-friends-rail" : ""}${
          friendsRailOpen ? " rail-open" : ""
        }`}
      >
      {/* HERO + SEARCH */}
      <section className="hero">
        <h1 className="hero-title">
          PICK YOUR<br /><em>NEXT</em> WATCH
        </h1>
        <p className="hero-sub">Browse, rate, and vote with your group</p>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search movies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      {/* GRID */}
      <div className="section-header">
        <h2 className="section-title">
          {query
            ? "Search Results"
            : homeNav === "Watchlist"
              ? "My Watchlist"
              : "Now Showing"}
        </h2>
        {homeNav === "Home" && !query.trim() ? null : (
          <span className="result-count">
            {isHomeBrowse && filtered.length > HOME_PAGE_CHUNK
              ? `${displayedMovies.length} of ${filtered.length} movies`
              : `${filtered.length} movies`}
          </span>
        )}
      </div>

      {homeNav === "Home" && !query.trim() ? (
        <div className="now-filters-wrap">
          <div className="now-filter-tabs" aria-label="Now Showing list presets">
            {HOME_BROWSE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`now-filter-tab ${browsePreset === p.id ? "active" : ""}`}
                title={p.title}
                onClick={() => {
                  const chip = selectedGenreName == null ? "" : String(selectedGenreName).trim();
                  if (p.id === "foryou" && chip && isAuthenticated && accessToken) {
                    void addForYouGenreFromTag(chip);
                  }
                  setBrowsePreset(p.id);
                  setSelectedGenreName(null);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {browsePreset === "foryou" && isHomeBrowse ? (
            <p className="foryou-inline-count">
              {filtered.length > HOME_PAGE_CHUNK
                ? `${displayedMovies.length} of ${filtered.length} movies`
                : `${filtered.length} movies`}
            </p>
          ) : null}
          {browsePreset !== "foryou" ? (
            <div className="genre-chips-section">
              <div className="genre-chip-head-row">
                <p className="genre-chip-hint">
                  Pick a list above, then narrow with genre or theme chips — scroll sideways for more.
                </p>
                <span className="result-count result-count--genre-corner">
                  {isHomeBrowse && filtered.length > HOME_PAGE_CHUNK
                    ? `${displayedMovies.length} of ${filtered.length} movies`
                    : `${filtered.length} movies`}
                </span>
              </div>
              <div className="genre-chip-row">
                {[...(browseGenres.length ? browseGenres : [])]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .filter((g) => String(g.name || "").trim())
                  .map((g) => {
                    const label = String(g.name || "").trim();
                    const selectedTrim =
                      selectedGenreName == null ? "" : String(selectedGenreName).trim();
                    const isActive = Boolean(label && selectedTrim === label);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        className={`genre-pill ${isActive ? "active" : ""}`}
                        onClick={() => {
                          if (!label) return;
                          const wasActive = isActive;
                          setSelectedGenreName(wasActive ? null : label);
                          if (isAuthenticated && accessToken && !wasActive) {
                            void addForYouGenreFromTag(label);
                          }
                        }}
                      >
                        {g.name.trim()}
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : null}
          <div className="genre-chips-section">
            <div className="genre-chip-head-row">
              <p className="genre-chip-hint">
                Pick a list above, then narrow with genre or theme chips — scroll sideways for more.
              </p>
              <span className="result-count result-count--genre-corner">
                {isHomeBrowse && filtered.length > HOME_PAGE_CHUNK
                  ? `${displayedMovies.length} of ${filtered.length} movies`
                  : `${filtered.length} movies`}
              </span>
            </div>
            <div className="genre-chip-row">
              {[...(browseGenres.length ? browseGenres : [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`genre-pill ${selectedGenreName === g.name ? "active" : ""}`}
                    onClick={() => {
                      if (browsePreset === "foryou") {
                        addForYouGenreFromTag(g.name);
                      }
                      setSelectedGenreName((prev) => (prev === g.name ? null : g.name));
                    }}
                  >
                    {g.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎞️</div>
            <p>No movies found for "{query}"</p>
          </div>
        ) : (
          displayedMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              userRating={ratings[String(movie.id)] ?? ratings[movie.id]}
              inWatchlist={watchlistIds.includes(String(movie.id))}
              onRate={handleRate}
              onWatchlist={handleWatchlist}
              isAuthenticated={isAuthenticated}
              onLoginClick={() => onNavigate("login")}
            />
          ))
        )}
      </div>

      {homeNav === "Home" && !query.trim() && browsePreset === "foryou" ? (
        <div className="foryou-meta foryou-meta--below">
          {!isAuthenticated ? (
            <p className="foryou-guest-hint">
              <strong>For you</strong> uses your saved favorite genres and titles you rate 4★ or higher.{" "}
              <button type="button" className="foryou-login-link" onClick={() => onNavigate("login")}>
                Log in
              </button>{" "}
              to personalize this list. Until then, you will see the same broad picks as Trending.
            </p>
          ) : forYouTasteLabels.length > 0 ? (
            <div className="foryou-taste-line" role="group" aria-label="Your For you mix">
              <span className="foryou-taste-label">Your For you mix</span>
              {forYouTasteLabels.map((name, idx) => (
                <span key={`${name}-${idx}`} className="foryou-taste-tag">
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <div className="foryou-taste-line foryou-taste-muted">
              Add favorite genres to your account or rate any title here 4★+—until then, we are showing general
              trending-style picks.
            </div>
          )}
        </div>
      ) : null}

      {isHomeBrowse && filtered.length > HOME_PAGE_CHUNK ? (
        <div className="expand-wrap">
          <button
            type="button"
            className="expand-btn"
            onClick={() => {
              if (homeVisibleCount < filtered.length) {
                setHomeVisibleCount((c) => Math.min(c + HOME_PAGE_CHUNK, filtered.length));
              } else {
                setHomeVisibleCount(HOME_PAGE_CHUNK);
              }
            }}
          >
            {homeVisibleCount < filtered.length
              ? `Show ${Math.min(HOME_PAGE_CHUNK, filtered.length - homeVisibleCount)} more`
              : "Show fewer"}
          </button>
        </div>
      ) : null}
      </div>

      {showFriendsRail ? (
        <div className={`friends-rail${friendsRailOpen ? " open" : ""}`} aria-label="My friends">
          <button
            type="button"
            className="friends-rail-handle"
            onClick={() => setFriendsRailOpen((o) => !o)}
            aria-expanded={friendsRailOpen}
            aria-label={`Friends, ${railOnlineCount} active`}
          >
            <span className="friends-rail-handle-icon-wrap" aria-hidden>
              <svg
                className="friends-rail-handle-svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3.5" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className={`friends-rail-handle-badge${railOnlineCount > 0 ? " lit" : ""}`}>
                {railOnlineCount > 99 ? "99+" : railOnlineCount}
              </span>
            </span>
            <span>Friends</span>
            <span
              className={`friends-rail-handle-active-line${railOnlineCount > 0 ? " on" : ""}`}
              aria-hidden
            >
              {myActivityStatus === "invisible"
                ? "Invisible"
                : `${railOnlineCount} active`}
            </span>
            <span className="friends-rail-handle-chev" aria-hidden>
              {friendsRailOpen ? "◀" : "▶"}
            </span>
          </button>
          <aside className="friends-rail-panel">
            <div className="friends-rail-head">
              <div className="friends-rail-head-titles">
                <span className="friends-rail-title">Your friends</span>
                <span className={`friends-rail-sub${railOnlineCount > 0 ? "" : " muted"}`}>
                  {railOnlineCount} of {railFriendsList.length} active
                </span>
              </div>
              <span className="friends-rail-count">{railFriendsList.length}</span>
            </div>
            <div className="friends-activity-row">
              <span className="friends-activity-label">Your status</span>
              <select
                className={`friends-activity-select ${myActivityStatus}`}
                value={myActivityStatus}
                onChange={(event) => {
                  const nextStatus = normalizeActivityStatus(event.target.value);
                  const prevStatus = myActivityStatus;
                  prefsSyncGenRef.current += 1;
                  setMyActivityStatus(nextStatus);
                  if (!accessToken) return;
                  fetch("http://localhost:3000/api/v1/users/me", {
                    method: "PATCH",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      preferences: { activityStatus: nextStatus },
                    }),
                  })
                    .then((res) => {
                      if (!res.ok) setMyActivityStatus(prevStatus);
                    })
                    .catch(() => setMyActivityStatus(prevStatus));
                }}
                aria-label="Set your activity status"
              >
                {ACTIVITY_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="friends-find-in-panel"
              onClick={() => {
                setFriendsRailOpen(false);
                setFriendsOpen(true);
              }}
              aria-label="Find friends"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3.5" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Find friends
            </button>
            <div className="friends-rail-list">
              {railFriendsList.length === 0 ? (
                <p className="friends-rail-empty">
                  No friends yet. Accept a request from the bell, use Friends search, or add someone in the app.
                </p>
              ) : (
                railFriendsList.map((f) => (
                  <div key={`${f.userId}-${f.displayName}`} className="friends-rail-row">
                    <span
                      className={`friends-rail-online${
                        f.isOnline ? (f.activityStatus === "away" ? " away" : f.activityStatus === "busy" ? " busy" : " on") : ""
                      }${!f.isOnline || f.activityStatus === "invisible" ? " invisible" : ""}`}
                      title={
                        f.isOnline
                          ? f.activityStatus === "away"
                            ? "Away"
                            : f.activityStatus === "busy"
                              ? "Busy"
                              : "Active"
                          : "Offline"
                      }
                      aria-label={
                        f.isOnline
                          ? f.activityStatus === "away"
                            ? "Away"
                            : f.activityStatus === "busy"
                              ? "Busy"
                              : "Active"
                          : "Offline"
                      }
                    />
                    <div className="avatar">{f.displayName.charAt(0).toUpperCase()}</div>
                    <span className="friends-rail-name" title={f.displayName}>
                      {f.displayName}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {friendsOpen ? (
        <div className="friends-overlay" onClick={() => setFriendsOpen(false)}>
          <div className="friends-panel" onClick={(event) => event.stopPropagation()}>
            <div className="friends-head">
              <h3 className="friends-title">Friends</h3>
              <button className="friends-close" type="button" onClick={() => setFriendsOpen(false)}>
                ×
              </button>
            </div>
            <div className="friends-search-row">
              <input
                className="friends-search"
                type="text"
                placeholder="Name, user #, or account ID…"
                value={friendsQuery}
                onChange={(event) => setFriendsQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runFriendsSearch();
                  }
                }}
              />
              <button
                type="button"
                className="friends-search-btn"
                disabled={!accessToken || !friendsQuery.trim()}
                onClick={() => runFriendsSearch()}
              >
                Search
              </button>
            </div>
            <div className="friends-results">
              {friendResults.map((friend) => (
                  <div className="friend-card" key={friend.id}>
                    <div className="friend-meta">
                      <div className="avatar">{friend.displayName.charAt(0).toUpperCase()}</div>
                      <div className="friend-meta-text">
                        <p className="friend-name">{friend.displayName}</p>
                        <p className="friend-source">How you know them: {friend.source}</p>
                        <p className="friend-source">
                          {friend.numericId != null ? `User #${friend.numericId} · ` : null}
                          Account ID: {friend.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="friend-invite-btn"
                      onClick={() => handleInviteFriend(friend)}
                      disabled={
                        normalizeName(friend.displayName) === normalizeName(highlightedName || "") ||
                        areFriends(highlightedName || "", friend.displayName) ||
                        friendRequests.some(
                          (req) =>
                            req.status === "pending" &&
                            normalizeName(req.requesterName) === normalizeName(highlightedName || "") &&
                            normalizeName(req.targetUserName) === normalizeName(friend.displayName)
                        )
                      }
                    >
                      {areFriends(highlightedName || "", friend.displayName)
                        ? "Added"
                        : friendRequests.some(
                            (req) =>
                              req.status === "pending" &&
                              normalizeName(req.requesterName) === normalizeName(highlightedName || "") &&
                              normalizeName(req.targetUserName) === normalizeName(friend.displayName)
                          )
                          ? "Requested"
                          : "Add Friend"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
