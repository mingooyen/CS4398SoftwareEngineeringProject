import { useEffect, useMemo, useState } from "react";
import {
  acceptInvite,
  acceptFriendRequest,
  denyFriendRequest,
  normalizeName,
  readFriendRequests,
  readGroups,
  readInvites,
  writeFriendRequests,
  writeGroups,
  writeInvites,
} from "./groupDataStore.js";
import { getGenrePreferencesForDisplayName } from "./authService.js";
import { createPosterErrorHandler, makePosterDataUri } from "./posterUtils.js";

function VoteBar({ votes, max }) {
  const pct = max > 0 ? (votes / max) * 100 : 0;
  return (
    <div className="vote-bar-track">
      <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function RecommendationCard({ movie, maxVotes, onVote }) {
  const isLeading = movie.votes === maxVotes && maxVotes > 0;

  return (
    <div className={`rec-card ${isLeading ? "leading" : ""}`}>
      {isLeading && <div className="leading-badge">🏆 Leading</div>}
      <div className="rec-poster-wrap">
        <img
          src={
            movie.poster ||
            makePosterDataUri(movie.title)
          }
          alt={movie.title}
          className="rec-poster"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={createPosterErrorHandler(movie.title)}
        />
      </div>
      <div className="rec-body">
        <div className="rec-meta">
          <span className="rec-genre">{movie.genre || "General"}</span>
          <span className="rec-year">{movie.year || "—"}</span>
        </div>
        <h3 className="rec-title">{movie.title}</h3>
        <p className="rating-num" style={{ marginBottom: "8px" }}>
          {movie.providers?.length
            ? `Where to watch: ${movie.providers.map((p) => p.providerName).slice(0, 3).join(", ")}`
            : "Where to watch info unavailable"}
        </p>
        <div className="rec-rating">
          <span className="stars">
            {"★".repeat(Math.round(movie.avgRating || 0))}
            {"☆".repeat(5 - Math.round(movie.avgRating || 0))}
          </span>
          <span className="rating-num">{(movie.avgRating || 0).toFixed(1)} avg</span>
        </div>

        <div className="vote-row">
          <VoteBar votes={movie.votes || 0} max={maxVotes} />
          <span className="vote-count">{movie.votes || 0} vote{movie.votes === 1 ? "" : "s"}</span>
        </div>

        <button
          className={`vote-btn ${movie.userVoted ? "voted" : ""}`}
          onClick={() => onVote(movie.id)}
          disabled={movie.userVoted}
        >
          {movie.userVoted ? "✓ Voted" : "Vote"}
        </button>
      </div>
    </div>
  );
}

function ScheduleForm({ onSchedule, movies }) {
  const [selectedMovie, setSelectedMovie] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = () => {
    if (!selectedMovie || !date || !time) return;
    onSchedule({ movie: selectedMovie, date, time, location });
    setSelectedMovie("");
    setDate("");
    setTime("");
    setLocation("");
  };

  return (
    <div className="schedule-form">
      <h3 className="form-title">📅 Schedule a Session</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Movie</label>
          <select value={selectedMovie} onChange={(e) => setSelectedMovie(e.target.value)}>
            <option value="">Select a movie...</option>
            {(movies ?? []).map((m) => (
              <option key={m.id} value={m.title}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="form-field">
          <label>
            Location / Link <span className="optional">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Mi's place or zoom.us/..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>
      <button className="schedule-btn" onClick={handleSubmit}>
        Confirm Session
      </button>
    </div>
  );
}

function UpcomingCard({ session }) {
  const d = new Date(`${session.date}T${session.time}`);
  const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeFormatted = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="upcoming-card">
      <div className="upcoming-date">
        <span className="up-month">{d.toLocaleDateString("en-US", { month: "short" })}</span>
        <span className="up-day">{d.getDate()}</span>
      </div>
      <div className="upcoming-info">
        <p className="upcoming-movie">{session.title}</p>
        <p className="upcoming-time">{formatted} · {timeFormatted}</p>
        {session.location && <p className="upcoming-loc">📍 {session.location}</p>}
      </div>
      <div className="upcoming-badge">UPCOMING</div>
    </div>
  );
}

export default function GroupDetailPage({
  groupId = "",
  highlightedName = "",
  onBack,
  onNavigate,
  onLogout,
  isSystemAdmin = false,
  onOpenAdmin,
}) {
  const currentUserName = highlightedName?.trim() || "You";
  const [activeTab, setActiveTab] = useState("recommendations");
  const [groups, setGroups] = useState(() => readGroups());
  const [groupInvites, setGroupInvites] = useState(() => readInvites());
  const [friendRequests, setFriendRequests] = useState(() => readFriendRequests());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [liveMovies, setLiveMovies] = useState([]);

  useEffect(() => {
    setGroups(readGroups());
    setGroupInvites(readInvites());
    setFriendRequests(readFriendRequests());
  }, [groupId, highlightedName]);

  const group = useMemo(() => groups.find((g) => g.id === groupId) ?? null, [groups, groupId]);
  const activeGroup = group;
  const creatorMember = activeGroup?.members?.find((m) => m.role === "creator");
  const canManageGroup =
    isSystemAdmin ||
    (creatorMember &&
      normalizeName(creatorMember.name) === normalizeName(currentUserName));
  const visibleInvites = groupInvites.filter(
    (invite) => normalizeName(invite.invitedUserName) === normalizeName(currentUserName)
  );
  const visibleFriendRequests = friendRequests.filter(
    (req) => normalizeName(req.targetUserName) === normalizeName(currentUserName)
  );
  const navItems = ["Home", "My Groups", "Watchlist", ...(isSystemAdmin ? ["Admin"] : []), "Logout"];

  const movies = useMemo(
    () =>
      (liveMovies || []).map((m) => ({
        id: String(m.id),
        title: m.title,
        year: m.year || new Date().getFullYear(),
        genre: "Mixed",
        avgRating: Number(m.rating || 0) / 2,
        votes: 0,
        userVoted: false,
        poster:
          m.poster ||
          makePosterDataUri((m.title || "MOVIE").slice(0, 16)),
        providers: m.providers || [],
      })),
    [liveMovies]
  );
  const maxVotes = Math.max(...movies.map((m) => m.votes || 0), 0);

  const handleVote = (movieId) => {
    // Local UI-only vote state for now.
    const next = movies.map((m) =>
      m.id === movieId ? { ...m, votes: (m.votes || 0) + 1, userVoted: true } : m
    );
    // We keep recommendations derived; write temporary votes into local schedule-only state by replacing tab source.
    // This avoids introducing new global storage while preserving UX.
    if (activeGroup) {
      const g = groups.map((x) => (x.id === activeGroup.id ? { ...x, _uiMovies: next } : x));
      setGroups(g);
    }
  };

  const tabMovies = activeGroup?._uiMovies || movies;
  const sortedMovies = [...tabMovies].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

  const handleSchedule = ({ movie, date, time, location }) => {
    setScheduled((prev) => [...prev, { id: Date.now(), title: movie, date, time, location }]);
    setActiveTab("schedule");
  };

  const handleNavClick = (item) => {
    if (item === "Home") onNavigate("home", { homeTab: "Home" });
    else if (item === "My Groups") onNavigate("group", { scrollToMyGroups: true });
    else if (item === "Watchlist") onNavigate("home", { homeTab: "Watchlist" });
    else if (item === "Logout") onLogout();
    else if (item === "Admin") onOpenAdmin?.();
  };

  const handleJoinInvite = (inviteId) => {
    acceptInvite(inviteId, currentUserName);
    setGroups(readGroups());
    setGroupInvites(readInvites());
  };
  const handleDenyInvite = (inviteId) => {
    writeInvites(groupInvites.filter((item) => item.id !== inviteId));
    setGroupInvites(readInvites());
  };
  const handleAcceptFriendRequest = (requestId) => {
    acceptFriendRequest(requestId);
    setFriendRequests(readFriendRequests());
  };
  const handleDenyFriendRequest = (requestId) => {
    denyFriendRequest(requestId);
    setFriendRequests(readFriendRequests());
  };

  const handleInviteMember = () => {
    const target = inviteName.trim();
    if (!target || !activeGroup) return;
    const alreadyMember = (activeGroup.members || []).some(
      (m) => normalizeName(m.name) === normalizeName(target)
    );
    if (alreadyMember) {
      setActionMsg("That person is already a member.");
      return;
    }
    const duplicate = groupInvites.some(
      (i) =>
        i.groupId === activeGroup.id &&
        normalizeName(i.invitedUserName) === normalizeName(target)
    );
    if (duplicate) {
      setActionMsg("Invite already sent.");
      return;
    }
    writeInvites([
      ...groupInvites,
      {
        id: `gi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        groupId: activeGroup.id,
        groupName: activeGroup.name,
        invitedUserName: target,
        inviterName: currentUserName,
      },
    ]);
    setGroupInvites(readInvites());
    setInviteName("");
    setInviteOpen(false);
    setActionMsg(`Invite sent to ${target}.`);
  };

  const handleDeleteGroup = () => {
    if (!activeGroup || !canManageGroup) return;
    const remaining = groups.filter((g) => g.id !== activeGroup.id);
    writeGroups(remaining);
    writeInvites(groupInvites.filter((i) => i.groupId !== activeGroup.id));
    setActionMsg("Group deleted.");
    onBack?.();
  };

  useEffect(() => {
    if (!activeGroup) return;
    const names = (activeGroup.members || []).map((m) => m.name).filter(Boolean);
    const genreSet = new Set();
    names.forEach((name) => {
      const prefs = getGenrePreferencesForDisplayName(name);
      (prefs || []).forEach((g) => genreSet.add(g));
    });
    const genreCsv = [...genreSet].join(",");
    const q = new URLSearchParams();
    if (genreCsv) q.set("genres", genreCsv);
    q.set("region", "US");
    q.set("limit", "150");
    fetch(`http://localhost:3000/api/v1/movies/discover?${q.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!Array.isArray(payload?.movies)) return;
        setLiveMovies(payload.movies);
      })
      .catch(() => setLiveMovies([]));
  }, [activeGroup]);

  if (!group) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={onBack}>Back</button>
        <p>Group not found.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; color: #f0ece4; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        .nav { position: sticky; top: 0; z-index: 100; background: rgba(13,13,13,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid #1e1e1e; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; height: 64px; }
        .nav-left { display: flex; align-items: center; gap: 10px; position: relative; }
        .notif-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #2e2e2e; background: #141414; color: #d2d2d2; cursor: pointer; position: relative; font-size: 16px; }
        .notif-btn:hover { border-color: #4a4a4a; color: #f0ece4; }
        .notif-badge { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; border-radius: 999px; background: #e74c3c; color: #fff; border: 2px solid #0d0d0d; font-size: 10px; line-height: 14px; text-align: center; padding: 0 3px; }
        .notif-panel { position: absolute; top: 44px; left: 0; width: min(420px, calc(100vw - 40px)); background: #121212; border: 1px solid #2a2a2a; border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,0.45); padding: 12px; z-index: 120; }
        .notif-title { font-size: 12px; color: #8f8f8f; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .notif-empty { font-size: 13px; color: #666; padding: 6px 2px; }
        .notif-item { border: 1px solid #232323; border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; background: #111; }
        .notif-meta { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .notif-main { font-size: 13px; color: #e4e4e4; }
        .notif-sub { font-size: 11px; color: #7a7a7a; }
        .notif-actions { display: flex; gap: 6px; }
        .notif-approve, .notif-deny { padding: 6px 9px; border-radius: 7px; font-size: 11px; cursor: pointer; border: 1px solid transparent; background: transparent; }
        .notif-approve { border-color: #2f6f95; color: #9fd4ff; }
        .notif-deny { border-color: #6a2e2e; color: #ff9d9d; }
        .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 2px; color: #e8c547; }
        .nav-logo span { color: #f0ece4; }
        .nav-links { display: flex; gap: 8px; }
        .nav-link { background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: #888; padding: 8px 16px; border-radius: 6px; transition: color 0.2s, background 0.2s; letter-spacing: 0.5px; }
        .nav-link:hover { color: #f0ece4; background: #1a1a1a; }
        .nav-link.active { color: #e8c547; background: rgba(232,197,71,0.08); }
        .page-header { padding: 48px 40px 0; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
        .group-meta { display: flex; flex-direction: column; gap: 8px; }
        .group-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #e8c547; font-weight: 500; }
        .group-name { font-family: 'Bebas Neue', sans-serif; font-size: clamp(36px, 5vw, 56px); letter-spacing: 2px; color: #f0ece4; line-height: 1; }
        .group-actions { display: flex; gap: 10px; align-items: center; }
        .invite-btn, .delete-btn { padding: 10px 14px; border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; }
        .invite-btn { border: 1px solid #2f6f95; color: #9fd4ff; }
        .delete-btn { border: 1px solid #7a2b2b; color: #ff9d9d; }
        .invite-overlay { position: fixed; inset: 0; z-index: 210; background: rgba(0,0,0,0.72); display: grid; place-items: center; padding: 20px; }
        .invite-modal { width: min(560px, 100%); background: #121212; border: 1px solid #2a2a2a; border-radius: 12px; padding: 16px; }
        .invite-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .invite-close { background: #1e1e1e; color: #bbb; border: 1px solid #343434; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; }
        .invite-input { width: 100%; background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; color: #f0ece4; padding: 10px 12px; margin-bottom: 12px; }
        .msg { color: #9fd4ff; font-size: 13px; margin-top: 10px; }
        .tabs { display: flex; gap: 4px; padding: 32px 40px 0; border-bottom: 1px solid #1e1e1e; }
        .tab { background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: #555; padding: 10px 20px; border-bottom: 2px solid transparent; transition: color 0.2s, border-color 0.2s; margin-bottom: -1px; }
        .tab:hover { color: #f0ece4; }
        .tab.active { color: #e8c547; border-bottom-color: #e8c547; }
        .content { padding: 36px 40px 80px; }
        .back-btn { padding: 10px 14px; border: 1px solid #3a3a3a; background: transparent; color: #ddd; border-radius: 8px; cursor: pointer; margin-bottom: 16px; }
        .section-intro { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .section-heading { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 2px; color: #f0ece4; }
        .sort-note { font-size: 12px; color: #555; font-style: italic; }
        .rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .rec-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; overflow: hidden; transition: transform 0.25s, box-shadow 0.25s, border-color 0.2s; position: relative; }
        .rec-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(0,0,0,0.5); border-color: #2e2e2e; }
        .rec-card.leading { border-color: rgba(232,197,71,0.35); box-shadow: 0 0 0 1px rgba(232,197,71,0.1); }
        .leading-badge { position: absolute; top: 12px; left: 12px; z-index: 2; background: rgba(232,197,71,0.9); color: #0d0d0d; font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; }
        .rec-poster-wrap { aspect-ratio: 16/9; overflow: hidden; }
        .rec-poster { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
        .rec-card:hover .rec-poster { transform: scale(1.04); }
        .rec-body { padding: 16px; }
        .rec-meta { display: flex; gap: 8px; margin-bottom: 6px; }
        .rec-genre { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #e8c547; background: rgba(232,197,71,0.08); padding: 3px 8px; border-radius: 4px; }
        .rec-year { font-size: 12px; color: #555; align-self: center; }
        .rec-title { font-size: 17px; font-weight: 500; color: #f0ece4; margin-bottom: 8px; }
        .rec-rating { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .stars { color: #e8c547; font-size: 13px; letter-spacing: 1px; }
        .rating-num { font-size: 12px; color: #666; }
        .vote-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .vote-bar-track { flex: 1; height: 4px; background: #1e1e1e; border-radius: 2px; overflow: hidden; }
        .vote-bar-fill { height: 100%; background: #e8c547; border-radius: 2px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .vote-count { font-size: 12px; color: #555; white-space: nowrap; }
        .vote-btn { width: 100%; padding: 10px; background: #e8c547; color: #0d0d0d; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; }
        .vote-btn.voted { background: #1e1e1e; color: #666; border: 1px solid #2e2e2e; }
        .schedule-form { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 28px; margin-bottom: 32px; }
        .form-title { font-size: 16px; font-weight: 500; color: #f0ece4; margin-bottom: 20px; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; }
        .form-field label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #666; font-weight: 500; }
        .optional { color: #444; font-size: 10px; letter-spacing: 0; text-transform: none; }
        .form-field input, .form-field select { background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; color: #f0ece4; font-size: 14px; padding: 10px 14px; }
        .schedule-btn { padding: 12px 28px; background: transparent; border: 1px solid #e8c547; color: #e8c547; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .upcoming-list { display: flex; flex-direction: column; gap: 12px; }
        .upcoming-card { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; }
        .upcoming-date { display: flex; flex-direction: column; align-items: center; min-width: 48px; background: rgba(232,197,71,0.08); border: 1px solid rgba(232,197,71,0.15); border-radius: 8px; padding: 8px; }
        .up-month { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #e8c547; }
        .up-day { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #f0ece4; line-height: 1; }
        .upcoming-info { flex: 1; }
        .upcoming-movie { font-size: 16px; font-weight: 500; color: #f0ece4; margin-bottom: 4px; }
        .upcoming-time { font-size: 13px; color: #666; margin-bottom: 2px; }
        .upcoming-loc { font-size: 12px; color: #555; }
        .upcoming-badge { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #e8c547; background: rgba(232,197,71,0.08); border: 1px solid rgba(232,197,71,0.2); padding: 4px 10px; border-radius: 20px; }
        .members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-top: 18px; }
        .member-card { background: #121212; border: 1px solid #222; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .member-left { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 34px; height: 34px; border-radius: 50%; background: #1e1e1e; border: 1px solid #2e2e2e; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #888; }
        .avatar.creator { border-color: #e8c547; color: #e8c547; }
        .member-role { font-size: 11px; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.7px; }
      `}</style>

      <nav className="nav">
        <div className="nav-left">
          <button type="button" className="notif-btn" aria-label="Notifications" onClick={() => setNotificationsOpen((v) => !v)}>
            🔔
            {visibleInvites.length + visibleFriendRequests.length > 0 ? (
              <span className="notif-badge">{visibleInvites.length + visibleFriendRequests.length}</span>
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
                    <div className="notif-meta">
                      <div className="notif-text">
                        <p className="notif-main">You are invited to join</p>
                        <p className="notif-sub">{invite.groupName} - Invited by {invite.inviterName}</p>
                      </div>
                    </div>
                    <div className="notif-actions">
                      <button className="notif-approve" type="button" onClick={() => handleJoinInvite(invite.id)}>Join</button>
                      <button className="notif-deny" type="button" onClick={() => handleDenyInvite(invite.id)}>Deny</button>
                    </div>
                  </div>
                ))
              )}
              <p className="notif-title" style={{ marginTop: 12 }}>Friend Requests</p>
              {visibleFriendRequests.map((req) => (
                <div key={req.id} className="notif-item">
                  <div className="notif-text">
                    <p className="notif-main">{req.requesterName} sent you a friend request</p>
                    <p className="notif-sub">Requester ID: {req.requesterId}</p>
                  </div>
                  <div className="notif-actions">
                    <button className="notif-approve" type="button" onClick={() => handleAcceptFriendRequest(req.id)}>Accept</button>
                    <button className="notif-deny" type="button" onClick={() => handleDenyFriendRequest(req.id)}>Deny</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <button type="button" className="nav-logo" onClick={() => onNavigate("home", { homeTab: "Home" })} style={{ background: "none", border: "none", cursor: "pointer" }}>
            MOVIE<span>NIGHT</span>
          </button>
        </div>
        <div className="nav-links">
          {navItems.map((item) => (
            <button key={item} className={`nav-link ${item === "My Groups" ? "active" : ""}`} onClick={() => handleNavClick(item)}>
              {item}
            </button>
          ))}
        </div>
      </nav>

      <header className="page-header">
        <div className="group-meta">
          <span className="group-label">Group</span>
          <h1 className="group-name">{activeGroup?.name}</h1>
        </div>
        {canManageGroup ? (
          <div className="group-actions">
            <button className="invite-btn" type="button" onClick={() => setInviteOpen(true)}>
              + Invite Member
            </button>
            <button className="delete-btn" type="button" onClick={handleDeleteGroup}>
              Delete Group
            </button>
          </div>
        ) : null}
      </header>
      {inviteOpen ? (
        <div className="invite-overlay" onClick={() => setInviteOpen(false)}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invite-head">
              <h3>Invite Member to {activeGroup?.name}</h3>
              <button className="invite-close" type="button" onClick={() => setInviteOpen(false)}>×</button>
            </div>
            <input
              className="invite-input"
              type="text"
              placeholder="Enter person name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <button className="invite-btn" type="button" onClick={handleInviteMember}>
              Send Invite
            </button>
          </div>
        </div>
      ) : null}

      <div className="tabs">
        {[
          { id: "recommendations", label: "🎬 Recommendations" },
          { id: "vote", label: "🗳️ Vote" },
          { id: "schedule", label: "📅 Schedule" },
        ].map((tab) => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <main className="content">
        <button className="back-btn" type="button" onClick={onBack}>← Back to My Groups</button>
        {actionMsg ? <p className="msg">{actionMsg}</p> : null}

        {activeTab === "recommendations" && (
          <>
            <div className="section-intro">
              <h2 className="section-heading">Top Picks for Your Group</h2>
              <span className="sort-note">Ranked by genre match to members&apos; tastes + catalog</span>
            </div>
            <div className="rec-grid">
              {sortedMovies.length === 0 ? (
                <p style={{ color: "#666" }}>No recommendations yet.</p>
              ) : (
                sortedMovies.map((movie) => (
                  <RecommendationCard key={movie.id} movie={movie} maxVotes={maxVotes} onVote={handleVote} />
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "vote" && (
          <>
            <div className="section-intro">
              <h2 className="section-heading">Cast Your Vote</h2>
              <span className="sort-note">One vote per movie</span>
            </div>
            <div className="rec-grid">
              {[...tabMovies].sort((a, b) => (b.votes || 0) - (a.votes || 0)).map((movie) => (
                <RecommendationCard key={movie.id} movie={movie} maxVotes={maxVotes} onVote={handleVote} />
              ))}
            </div>
          </>
        )}

        {activeTab === "schedule" && (
          <>
            <ScheduleForm onSchedule={handleSchedule} movies={tabMovies} />
            <div className="section-intro" style={{ marginTop: 8 }}>
              <h2 className="section-heading">Upcoming Sessions</h2>
            </div>
            {scheduled.length === 0 ? (
              <p style={{ color: "#666" }}>No sessions scheduled yet.</p>
            ) : (
              <div className="upcoming-list">
                {scheduled.map((s) => (
                  <UpcomingCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="section-intro" style={{ marginTop: 24 }}>
          <h2 className="section-heading">Current Members</h2>
        </div>
        <div className="members-grid">
          {(activeGroup?.members || []).map((member) => (
            <div className="member-card" key={member.id}>
              <div className="member-left">
                <div className={`avatar ${member.role === "creator" ? "creator" : ""}`}>
                  {member.avatar || member.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p>
                    {member.name} {member.role === "creator" ? "👑" : ""}
                  </p>
                  <p className="member-role">
                    {member.role}
                    {normalizeName(member.name) === normalizeName(currentUserName) ? " • You" : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
