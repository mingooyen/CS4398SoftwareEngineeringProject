import { useEffect, useMemo, useState } from "react";
import {
  acceptInvite,
  acceptFriendRequest,
  areFriends,
  denyInvite,
  denyFriendRequest,
  normalizeName,
  readFriendNotifications,
  readFriendRequests,
  readInvites,
  sendFriendRequest,
  writeFriendNotifications,
} from "./groupDataStore.js";
import { getDemoDirectoryPeople } from "./authService.js";
import { isUserBannedForFriend } from "./adminDataStore.js";

// Mock movie data — replace with TMDB/OMDB API calls

const MOCK_MOVIES = [
  { id: 1, title: "Dune: Part Two", year: 2024, rating: 8.5, poster: "https://via.placeholder.com/300x450/1a1a2e/e94560?text=DUNE+2" },
  { id: 2, title: "Poor Things", year: 2023, rating: 7.8, poster: "https://via.placeholder.com/300x450/16213e/0f3460?text=POOR+THINGS" },
  { id: 3, title: "Oppenheimer", year: 2023, rating: 8.9, poster: "https://via.placeholder.com/300x450/0f3460/e94560?text=OPPENHEIMER" },
  { id: 4, title: "Past Lives", year: 2023, rating: 7.9, poster: "https://via.placeholder.com/300x450/533483/e94560?text=PAST+LIVES" },
  { id: 5, title: "The Zone of Interest", year: 2024, rating: 7.4, poster: "https://via.placeholder.com/300x450/1a1a2e/a8dadc?text=ZONE+OF+INTEREST" },
  { id: 6, title: "Saltburn", year: 2023, rating: 7.1, poster: "https://via.placeholder.com/300x450/2d2d2d/ffd700?text=SALTBURN" },
  { id: 7, title: "American Fiction", year: 2023, rating: 7.6, poster: "https://via.placeholder.com/300x450/1e3a5f/ffffff?text=AMERICAN+FICTION" },
  { id: 8, title: "Killers of the Flower Moon", year: 2023, rating: 7.7, poster: "https://via.placeholder.com/300x450/3d1a00/ff6b00?text=KILLERS" },
];
// Frontend fallback directory data. Remove once friends/profile APIs are fully live.
const MOCK_FRIENDS = [
  { id: "1001", displayName: "Mi", source: "Friend" },
  { id: "1002", displayName: "Jordan", source: "Other Group" },
  { id: "1003", displayName: "Alex", source: "Other Group" },
  { id: "1004", displayName: "Nivah", source: "Friend" },
  { id: "1005", displayName: "Xavier", source: "Friend" },
];

function StarRating({ movieId, initialRating, onRate }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(initialRating || 0);

  const handleRate = (score) => {
    setSelected(score);
    onRate(movieId, score);
  };

  return (
    <div style={{ display: "flex", gap: "2px", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            color: star <= (hovered || selected) ? "#f5c518" : "#444",
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

function MovieCard({ movie, userRating, inWatchlist, onRate, onWatchlist }) {
  const handleWatchlist = () => {
    onWatchlist(movie.id, !inWatchlist);
  };

  return (
    <div className="movie-card">
      <div className="card-poster-wrap">
        <img src={movie.poster} alt={movie.title} className="card-poster" />
        <div className="card-overlay">
          <button
            onClick={handleWatchlist}
            className={`watchlist-btn ${inWatchlist ? "active" : ""}`}
          >
            {inWatchlist ? "✓ Listed" : "+ Watchlist"}
          </button>
        </div>
      </div>
      <div className="card-info">
        <p className="card-year">{movie.year}</p>
        <h3 className="card-title">{movie.title}</h3>
        <p className="card-tmdb">
          <span className="tmdb-star">★</span> {movie.rating}
        </p>
        <div className="card-divider" />
        <p className="rate-label">Your Rating</p>
        <StarRating movieId={movie.id} initialRating={userRating} onRate={onRate} />
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
  const [friendsQuery, setFriendsQuery] = useState("");
  const [friendResults, setFriendResults] = useState([]);
  const isSelfFriend = (name = "") =>
    normalizeName(name) === normalizeName(highlightedName || "");

  const mergedFriendDirectory = useMemo(() => {
    const demo = getDemoDirectoryPeople();
    const mock = MOCK_FRIENDS;
    const byName = new Map();
    for (const d of demo) {
      byName.set(normalizeName(d.displayName), { ...d });
    }
    for (const m of mock) {
      const k = normalizeName(m.displayName);
      byName.set(k, { ...m, id: m.id });
    }
    return [...byName.values()].filter(
      (f) =>
        normalizeName(f.displayName) !== normalizeName(highlightedName || "") &&
        !isUserBannedForFriend(f)
    );
  }, [highlightedName, adminTick]);
  const visibleInvites = groupInvites.filter(
    (invite) => normalizeName(invite.invitedUserName) === normalizeName(highlightedName || "")
  );
  const visibleFriendRequests = friendRequests.filter(
    (req) => normalizeName(req.targetUserName) === normalizeName(highlightedName || "")
  );
  const visibleFriendNotifications = friendNotifications.filter(
    (note) => normalizeName(note.userName) === normalizeName(highlightedName || "")
  );

  const navItems = isAuthenticated
    ? [
        "Home",
        "Friends",
        "Groups",
        "Watchlist",
        ...(isSystemAdmin ? ["Admin"] : []),
        "Logout",
      ]
    : ["Home", "Groups", "Watchlist", "Login", "Signup"];

  const sourceMovies =
    homeNav === "Watchlist"
      ? MOCK_MOVIES.filter((movie) => watchlistIds.includes(movie.id))
      : MOCK_MOVIES;

  const filtered = sourceMovies.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()));

  const handleRate = (movieId, score) => {
    setRatings((prev) => ({ ...prev, [movieId]: score }));

    // Database integration hook:
    // send { userId, movieId, rating, ratedAt } to a backend ratings endpoint.
  };

  const handleWatchlist = (movieId, added) => {
    setWatchlistIds((prev) =>
      added ? [...new Set([...prev, movieId])] : prev.filter((id) => id !== movieId)
    );

    // Database integration hook:
    // send { userId, movieId, status: "added" | "removed", updatedAt }.
    console.log(`Movie ${movieId} ${added ? "added to" : "removed from"} watchlist`);
  };

  // ── Routes nav clicks to the right page or tab ──
  const handleNavClick = (item) => {
    if (item === "Groups") {
      onNavigate("group");
    } else if (item === "Logout") {
      onLogout();
    } else if (item === "Login") {
      onNavigate("login");
    } else if (item === "Signup") {
      onNavigate("signup");
    } else if (item === "Admin") {
      onOpenAdmin?.();
    } else if (item === "Friends") {
      setFriendsOpen(true);
    } else {
      onHomeNavChange(item);
    }
  };

  const goHomeRoot = () => {
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
    if (!friendsOpen) return;
    const q = friendsQuery.trim();
    if (!q) {
      setFriendResults(mergedFriendDirectory);
      return;
    }

    if (!accessToken) {
      const fallback = mergedFriendDirectory.filter(
        (friend) =>
          friend.displayName.toLowerCase().includes(q.toLowerCase()) ||
          String(friend.id).toLowerCase().includes(q.toLowerCase())
      );
      setFriendResults(fallback);
      return;
    }

    fetch(
      `http://localhost:3000/api/v1/users/search?q=${encodeURIComponent(q)}&limit=25`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (Array.isArray(payload?.users)) {
          const apiUsers = payload.users.map((user) => {
            const known = MOCK_FRIENDS.find(
              (mock) => normalizeName(mock.displayName) === normalizeName(user.displayName)
            );
            return {
              id: String(user.id),
              displayName: user.displayName,
              source: known?.source ?? "Directory",
            };
          }).filter(
            (user) => !isSelfFriend(user.displayName) && !isUserBannedForFriend(user)
          );
          const fallbackMatches = mergedFriendDirectory.filter(
            (friend) =>
              friend.displayName.toLowerCase().includes(q.toLowerCase()) ||
              String(friend.id).toLowerCase().includes(q.toLowerCase())
          );
          const merged = [...apiUsers];
          for (const friend of fallbackMatches) {
            const exists = merged.some(
              (item) =>
                normalizeName(item.displayName) === normalizeName(friend.displayName) &&
                String(item.id) === String(friend.id)
            );
            if (!exists) merged.push(friend);
          }
          setFriendResults(merged);
        }
      })
      .catch(() => {});
  }, [friendsOpen, friendsQuery, accessToken, highlightedName, mergedFriendDirectory]);

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
        .nav-links { display: flex; gap: 8px; }
        .friend-card {
          background: #121212;
          border: 1px solid #232323;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .friend-meta { display: flex; align-items: center; gap: 10px; }
        .friend-name { color: #f0ece4; font-size: 14px; }
        .friend-source { color: #8a8a8a; font-size: 11px; }
        .friend-invite-btn {
          border: 1px solid #2f6f95;
          color: #9fd4ff;
          background: transparent;
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 12px;
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
        .friends-search {
          width: 100%;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #f0ece4;
          font-size: 14px;
          padding: 10px 12px;
          margin-bottom: 12px;
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
        .nav-link.active { color: #e8c547; background: rgba(232,197,71,0.08); }

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
        .hero-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #e8c547;
          background: rgba(232,197,71,0.08);
          border: 1px solid rgba(232,197,71,0.2);
          padding: 5px 14px;
          border-radius: 20px;
          margin-bottom: 20px;
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

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 24px;
          padding: 0 40px 80px;
        }

        .movie-card {
          background: #111;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #1e1e1e;
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
          cursor: pointer;
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
          transition: opacity 0.25s;
        }
        .movie-card:hover .card-overlay { opacity: 1; }

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

        .card-info { padding: 14px 14px 18px; }
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
        .tmdb-star { color: #f5c518; }
        .card-divider { height: 1px; background: #1e1e1e; margin: 12px 0 10px; }
        .rate-label { font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; text-align: center; }

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
          .hero { padding: 48px 20px 36px; }
          .grid { padding: 0 20px 60px; }
          .section-header { padding: 0 20px; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-left">
          <button
            type="button"
            className="notif-btn"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((prev) => !prev)}
          >
            🔔
            {visibleInvites.length + visibleFriendRequests.length + visibleFriendNotifications.length > 0 ? (
              <span className="notif-badge">
                {visibleInvites.length + visibleFriendRequests.length + visibleFriendNotifications.length}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div className="notif-panel">
              <p className="notif-title">Group Invites</p>
              {visibleInvites.length === 0 ? (
                <p className="notif-empty">No pending invites for you.</p>
              ) : (
                visibleInvites.map((invite) => (
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
                visibleFriendRequests.map((req) => (
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
                visibleFriendNotifications.map((note) => (
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
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-link ${item === "Admin" ? "" : homeNav === item ? "active" : ""}`}
              onClick={() => handleNavClick(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>

      {/* HERO + SEARCH */}
      <section className="hero">
        <div className="hero-tag">🎬 Group Picks</div>
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
          {query ? "Search Results" : homeNav === "Watchlist" ? "My Watchlist" : "Now Showing"}
        </h2>
        <span className="result-count">
          {filtered.length} movies
        </span>
      </div>

      <div className="grid">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎞️</div>
            <p>No movies found for "{query}"</p>
          </div>
        ) : (
          filtered.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              userRating={ratings[movie.id]}
              inWatchlist={watchlistIds.includes(movie.id)}
              onRate={handleRate}
              onWatchlist={handleWatchlist}
            />
          ))
        )}
      </div>
      {friendsOpen ? (
        <div className="friends-overlay" onClick={() => setFriendsOpen(false)}>
          <div className="friends-panel" onClick={(event) => event.stopPropagation()}>
            <div className="friends-head">
              <h3 className="friends-title">Friends</h3>
              <button className="friends-close" type="button" onClick={() => setFriendsOpen(false)}>
                ×
              </button>
            </div>
            <input
              className="friends-search"
              type="text"
              placeholder="Search friends..."
              value={friendsQuery}
              onChange={(event) => setFriendsQuery(event.target.value)}
            />
            <div className="grid" style={{ padding: 0 }}>
              {friendResults.map((friend) => (
                  <div className="friend-card" key={friend.id}>
                    <div className="friend-meta">
                      <div className="avatar">{friend.displayName.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="friend-name">{friend.displayName}</p>
                        <p className="friend-source">How you know them: {friend.source}</p>
                        <p className="friend-source">ID: {friend.id}</p>
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
