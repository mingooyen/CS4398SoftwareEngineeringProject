import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  acceptInvite,
  acceptFriendRequest,
  denyFriendRequest,
  leaveGroup,
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

/** Max distinct movies the current user may vote for in one group (recommendations + vote tab). */
const MAX_USER_VOTE_PICKS = 10;

function VoteBar({ votes, max }) {
  const pct = max > 0 ? (votes / max) * 100 : 0;
  return (
    <div className="vote-bar-track">
      <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function RecommendationCard({
  movie,
  maxVotes,
  onVote,
  expanded,
  onExpandToggle,
  expandFromGridRectRef,
  userPicksCount = 0,
  maxUserPicks = MAX_USER_VOTE_PICKS,
  soleLeaderId = null,
}) {
  const slotRef = useRef(null);
  const cardRef = useRef(null);
  const expandFirstRef = useRef(null);
  const collapseFirstRef = useRef(null);
  const expandedVisualRectRef = useRef(null);
  const flipEndRef = useRef(null);
  const isLeading = soleLeaderId != null && String(soleLeaderId) === String(movie.id);
  const atPickLimit = userPicksCount >= maxUserPicks;
  const cannotAddNewVote = !movie.userVoted && atPickLimit;

  const clearSlotMinHeight = () => {
    if (slotRef.current) slotRef.current.style.minHeight = "";
  };

  const preserveSlotHeight = () => {
    const s = slotRef.current;
    if (!s) return;
    const h = s.getBoundingClientRect().height;
    if (h > 0) s.style.minHeight = `${h}px`;
  };

  useLayoutEffect(() => {
    if (!expanded) return;
    const el = cardRef.current;
    if (!el) return;
    const snap = () => {
      expandedVisualRectRef.current = el.getBoundingClientRect();
    };
    snap();
    const onWin = () => snap();
    window.addEventListener("resize", onWin);
    return () => window.removeEventListener("resize", onWin);
  }, [expanded]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const runFlip = (first, toExpanded) => {
      if (flipEndRef.current) {
        el.removeEventListener("transitionend", flipEndRef.current);
        flipEndRef.current = null;
      }
      const last = el.getBoundingClientRect();
      if (last.width < 2 || last.height < 2 || first.width < 1 || first.height < 1) {
        clearSlotMinHeight();
        return;
      }
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const sx = first.width / last.width;
      const sy = first.height / last.height;
      el.style.transition = "none";
      el.style.transformOrigin = "0 0";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = toExpanded
            ? "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.35s ease"
            : "transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)";
          el.style.transform = "";
          const onEnd = (e) => {
            if (e.propertyName !== "transform") return;
            el.removeEventListener("transitionend", onEnd);
            el.style.transition = "";
            el.style.transformOrigin = "";
            flipEndRef.current = null;
            if (!toExpanded) clearSlotMinHeight();
          };
          flipEndRef.current = onEnd;
          el.addEventListener("transitionend", onEnd);
        });
      });
    };

    if (expanded) {
      expandedVisualRectRef.current = null;
      let first = expandFirstRef.current;
      expandFirstRef.current = null;
      if (!first && expandFromGridRectRef?.current) {
        const fr = expandFromGridRectRef.current;
        expandFromGridRectRef.current = null;
        first = { left: fr.left, top: fr.top, width: fr.width, height: fr.height };
      }
      if (first) {
        runFlip(first, true);
      }
      return;
    }

    if (!expanded) {
      let cFirst = collapseFirstRef.current;
      collapseFirstRef.current = null;
      if (!cFirst && expandedVisualRectRef.current) {
        cFirst = expandedVisualRectRef.current;
        expandedVisualRectRef.current = null;
      }
      if (cFirst) {
        runFlip(cFirst, false);
        return;
      }
      clearSlotMinHeight();
    }
  }, [expanded]);

  useEffect(
    () => () => {
      const el = cardRef.current;
      if (el && flipEndRef.current) {
        el.removeEventListener("transitionend", flipEndRef.current);
        el.style.transition = "";
        el.style.transform = "";
        el.style.transformOrigin = "";
      }
      if (slotRef.current) slotRef.current.style.minHeight = "";
    },
    []
  );

  const toggleExpand = () => {
    const el = cardRef.current;
    if (!expanded) {
      if (el) expandFirstRef.current = el.getBoundingClientRect();
      preserveSlotHeight();
      onExpandToggle("open");
    } else {
      if (el) collapseFirstRef.current = el.getBoundingClientRect();
      onExpandToggle("close");
    }
  };

  return (
    <div
      ref={slotRef}
      className={`rec-card-slot${expanded ? " rec-card-slot--expanded" : ""}`}
      data-rec-slot={movie.id}
    >
      {expanded && <div className="rec-card-slot-outline" aria-hidden />}
      <div className={`rec-card-expand-host${expanded ? "" : " rec-card-expand-host--pass"}`}>
        <div
          ref={cardRef}
          className={`rec-card ${isLeading ? "leading" : ""}${expanded ? " rec-card--expanded" : ""}`}
        >
          {isLeading && <div className="leading-badge">🏆 Leading</div>}
          <div
            className="rec-card-hit"
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} full poster and details for ${movie.title}`}
            onClick={toggleExpand}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleExpand();
              }
            }}
          >
            <div className="rec-poster-wrap">
              <img
                src={
                  movie.poster ||
                  makePosterDataUri(movie.title)
                }
                alt=""
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
              <p className="rec-providers rating-num">
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
            </div>
          </div>
          <div className="rec-card-vote" onClick={(e) => e.stopPropagation()}>
            <div className="vote-row">
              <VoteBar votes={movie.votes || 0} max={maxVotes} />
              <span className="vote-count">{movie.votes || 0} vote{movie.votes === 1 ? "" : "s"}</span>
            </div>
            <button
              type="button"
              className={`vote-btn ${movie.userVoted ? "voted" : ""}${cannotAddNewVote ? " vote-btn--blocked" : ""}`}
              onClick={() => onVote(movie.id)}
              disabled={cannotAddNewVote}
              title={
                cannotAddNewVote
                  ? `You can vote for up to ${maxUserPicks} movies. Undo a pick to vote here.`
                  : undefined
              }
              aria-label={
                movie.userVoted
                  ? `Undo vote for ${movie.title}`
                  : cannotAddNewVote
                    ? `Cannot vote for ${movie.title}: ${maxUserPicks} picks already used`
                    : `Vote for ${movie.title}`
              }
            >
              {movie.userVoted ? "Undo vote" : cannotAddNewVote ? `${maxUserPicks} picks max` : "Vote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleForm({ onSchedule, movies }) {
  const [selectedMovie, setSelectedMovie] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (selectedMovie && !(movies ?? []).some((m) => m.title === selectedMovie)) {
      setSelectedMovie("");
    }
  }, [movies, selectedMovie]);

  const handleSubmit = () => {
    if (!selectedMovie || !date || !time) return;
    onSchedule({ movie: selectedMovie, date, time, location });
    setSelectedMovie("");
    setDate("");
    setTime("");
    setLocation("");
  };

  if (!movies || movies.length === 0) {
    return (
      <div className="schedule-form">
        <h3 className="form-title">📅 Schedule a Session</h3>
        <p className="schedule-empty-hint">
          Cast votes on the <strong>Recommendations</strong> tab first. You can only schedule movies that already have
          at least one vote in this group.
        </p>
      </div>
    );
  }

  return (
    <div className="schedule-form">
      <h3 className="form-title">📅 Schedule a Session</h3>
      <p className="schedule-movie-hint">Choose from titles that have been voted on (sorted by vote count).</p>
      <div className="form-grid">
        <div className="form-field">
          <label>Movie</label>
          <select value={selectedMovie} onChange={(e) => setSelectedMovie(e.target.value)}>
            <option value="">Select a movie...</option>
            {(movies ?? []).map((m) => (
              <option key={m.id} value={m.title}>
                {m.title} ({m.votes || 0} vote{(m.votes || 0) === 1 ? "" : "s"})
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
      <button type="button" className="schedule-btn" onClick={handleSubmit}>
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
  /** At most one recommendation card expanded (poster) at a time, across tabs. */
  const [expandedPosterMovieId, setExpandedPosterMovieId] = useState(null);
  /** FLIP “from” rect when opening via pointer on another card (see document capture listener). */
  const expandFromGridRectRef = useRef(null);
  /** After switching cards via document capture, ignore an immediate synthetic “close” from the same gesture. */
  const suppressPosterCloseUntilRef = useRef(0);
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
    setExpandedPosterMovieId(null);
    expandFromGridRectRef.current = null;
    suppressPosterCloseUntilRef.current = 0;
    // Do not depend on `highlightedName`: App refetches profile and updates name; reloading groups
    // from storage here wipes in-memory `_uiMovies` (votes) and makes controls feel broken.
  }, [groupId]);

  useEffect(() => {
    setExpandedPosterMovieId(null);
    expandFromGridRectRef.current = null;
    suppressPosterCloseUntilRef.current = 0;
  }, [activeTab]);

  useEffect(() => {
    if (!expandedPosterMovieId) return;
    const t = window.setTimeout(() => setExpandedPosterMovieId(null), 5000);
    return () => clearTimeout(t);
  }, [expandedPosterMovieId]);

  useEffect(() => {
    if (!expandedPosterMovieId) return;
    const onPointerDownCapture = (e) => {
      const slot = e.target.closest("[data-rec-slot]");
      if (!slot) return;
      const mid = slot.dataset.recSlot;
      if (!mid || String(mid) === String(expandedPosterMovieId)) return;
      if (e.target.closest(".rec-card-vote")) return;
      const hit = e.target.closest(".rec-card-hit");
      if (!hit || !slot.contains(hit)) return;
      const cardEl = slot.querySelector(".rec-card");
      if (!cardEl) return;
      const r = cardEl.getBoundingClientRect();
      expandFromGridRectRef.current = {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
      suppressPosterCloseUntilRef.current = Date.now() + 500;
      setExpandedPosterMovieId(String(mid));
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [expandedPosterMovieId]);

  const group = useMemo(() => groups.find((g) => g.id === groupId) ?? null, [groups, groupId]);
  const activeGroup = group;
  const creatorMember = activeGroup?.members?.find((m) => m.role === "creator");
  const canManageGroup =
    isSystemAdmin ||
    (creatorMember &&
      normalizeName(creatorMember.name) === normalizeName(currentUserName));
  const isCurrentUserMember = useMemo(
    () =>
      Boolean(
        activeGroup?.members?.some(
          (m) => normalizeName(m.name) === normalizeName(currentUserName)
        )
      ),
    [activeGroup?.members, currentUserName]
  );
  /** Public groups: any member may invite. Private: leader (or system admin) only. */
  const canSendInvites =
    isCurrentUserMember && (!Boolean(activeGroup?.isPrivate) || canManageGroup);
  const isGroupCreator = useMemo(
    () =>
      Boolean(
        creatorMember && normalizeName(creatorMember.name) === normalizeName(currentUserName)
      ),
    [creatorMember, currentUserName]
  );
  /** Members (not the creator) may leave from the header next to Invite. */
  const canLeaveGroup = isCurrentUserMember && !isGroupCreator;
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
  const tabMovies = activeGroup?._uiMovies || movies;
  const maxVotes =
    tabMovies.length > 0 ? Math.max(...tabMovies.map((m) => m.votes || 0), 0) : 0;
  const userPicksCount = useMemo(() => tabMovies.filter((m) => m.userVoted).length, [tabMovies]);

  /** Single movie id with the top vote count, or null if none / tied for first. */
  const soleLeaderMovieId = useMemo(() => {
    if (maxVotes <= 0) return null;
    const atMax = tabMovies.filter((m) => (m.votes || 0) === maxVotes);
    if (atMax.length !== 1) return null;
    return String(atMax[0].id);
  }, [tabMovies, maxVotes]);

  /** Titles with at least one group vote (any member). */
  const votedMovies = useMemo(
    () =>
      [...tabMovies]
        .filter((m) => (m.votes || 0) > 0)
        .sort((a, b) => (b.votes || 0) - (a.votes || 0)),
    [tabMovies]
  );
  /** Vote tab: only voted titles, max 10 (highest vote counts first). */
  const voteTabMovies = useMemo(() => votedMovies.slice(0, 10), [votedMovies]);
  const maxVoteTabVotes =
    voteTabMovies.length > 0 ? Math.max(...voteTabMovies.map((m) => m.votes || 0), 0) : 0;

  const handleVote = (movieId) => {
    setGroups((prev) => {
      const ag = prev.find((x) => x.id === groupId);
      if (!ag) return prev;
      const base = ag._uiMovies || movies;
      const target = base.find((m) => String(m.id) === String(movieId));
      if (!target) return prev;
      if (!target.userVoted) {
        const picks = base.filter((m) => m.userVoted).length;
        if (picks >= MAX_USER_VOTE_PICKS) return prev;
      }
      const next = base.map((m) => {
        if (String(m.id) !== String(movieId)) return m;
        if (m.userVoted) {
          return { ...m, votes: Math.max(0, (m.votes || 0) - 1), userVoted: false };
        }
        return { ...m, votes: (m.votes || 0) + 1, userVoted: true };
      });
      return prev.map((x) => (x.id === ag.id ? { ...x, _uiMovies: next } : x));
    });
  };

  const handlePosterExpandIntent = (movieId, intent) => {
    if (intent === "close") {
      if (Date.now() < suppressPosterCloseUntilRef.current) return;
      setExpandedPosterMovieId(null);
      return;
    }
    setExpandedPosterMovieId(String(movieId));
  };

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

  const handleLeaveGroup = () => {
    if (!activeGroup) return;
    const res = leaveGroup(activeGroup.id, currentUserName);
    if (res.status === "left") {
      setGroups(readGroups());
      onBack?.();
      return;
    }
    if (res.status === "creator-cannot-leave") {
      setActionMsg(
        "Group creators cannot leave with this button—delete the group instead, or add another leader first."
      );
    }
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
        .group-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
        .group-actions-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: flex-end; }
        .invite-btn, .delete-btn, .leave-header-btn { padding: 10px 14px; border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; font-family: 'DM Sans', sans-serif; font-weight: 500; }
        .invite-btn { border: 1px solid #2f6f95; color: #9fd4ff; }
        .delete-btn { border: 1px solid #7a2b2b; color: #ff9d9d; }
        .leave-header-btn { border: 1px solid #6a4a2a; color: #e8b89a; }
        .leave-header-btn:hover { border-color: #c98a5a; color: #ffd4c4; }
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
        .section-intro { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .section-intro-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; text-align: right; max-width: min(380px, 52vw); }
        .vote-picks-counter { font-size: 13px; font-weight: 600; color: #e8c547; letter-spacing: 0.04em; white-space: nowrap; }
        .vote-picks-counter--full { color: #ffb84d; }
        .section-heading { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 2px; color: #f0ece4; }
        .sort-note { font-size: 12px; color: #555; font-style: italic; }
        .rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; align-items: start; }
        .rec-card-slot {
          position: relative;
          z-index: 0;
          min-width: 0;
          width: 100%;
        }
        .rec-card-slot--expanded {
          position: relative;
          z-index: 40;
          pointer-events: none;
          isolation: isolate;
        }
        .rec-card-expand-host--pass { display: contents; }
        .rec-card-expand-host:not(.rec-card-expand-host--pass) {
          position: fixed;
          inset: 0;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: min(24px, 4vw);
          pointer-events: none;
        }
        .rec-card-expand-host:not(.rec-card-expand-host--pass) .rec-card {
          pointer-events: auto;
          position: relative;
          z-index: 1;
        }
        .rec-card-slot-outline {
          position: absolute;
          inset: 0;
          z-index: 0;
          border: 2px dashed rgba(232, 197, 71, 0.42);
          border-radius: 12px;
          box-sizing: border-box;
          pointer-events: none;
          background: transparent;
        }
        .rec-card {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 12px;
          overflow: hidden;
          transition: box-shadow 0.3s ease, border-color 0.2s;
          position: relative;
          width: 100%;
          min-width: 0;
          max-width: 100%;
        }
        .rec-card--expanded {
          position: relative;
          width: min(380px, calc(100vw - 48px));
          max-width: none;
          box-shadow: 0 28px 70px rgba(0,0,0,0.88), 0 0 0 1px rgba(255,255,255,0.07);
          border-color: #4a4a4a;
          overflow: visible;
        }
        .rec-card-hit {
          cursor: pointer;
          outline: none;
        }
        .rec-card-hit:focus-visible {
          box-shadow: inset 0 0 0 2px rgba(232,197,71,0.55);
          border-radius: 12px 12px 0 0;
        }
        .rec-card.leading { border-color: rgba(232,197,71,0.35); box-shadow: 0 0 0 1px rgba(232,197,71,0.1); }
        .leading-badge { position: absolute; top: 12px; left: 12px; z-index: 3; background: rgba(232,197,71,0.9); color: #0d0d0d; font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; }
        .rec-poster-wrap {
          aspect-ratio: 16/9;
          overflow: hidden;
          background: #080808;
          transition: aspect-ratio 0.38s ease, min-height 0.38s ease;
        }
        .rec-card--expanded .rec-poster-wrap {
          aspect-ratio: 2/3;
          min-height: 280px;
          max-height: min(72vh, 520px);
        }
        .rec-poster {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: object-fit 0.35s ease, transform 0.35s ease;
        }
        .rec-card--expanded .rec-poster {
          object-fit: contain;
          transform: none;
        }
        .rec-body { padding: 16px; background: #111; position: relative; }
        .rec-card--expanded .rec-body { box-shadow: 0 -12px 24px rgba(0,0,0,0.4); }
        .rec-providers { margin-bottom: 8px; line-height: 1.45; }
        .rec-card--expanded .rec-providers { color: #b0b0b0; }
        .rec-card-vote {
          padding: 0 16px 16px;
          background: #111;
        }
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
        .vote-btn.voted { background: #1e1e1e; color: #a8a8a8; border: 1px solid #3a3a3a; }
        .vote-btn.voted:hover { border-color: rgba(232,197,71,0.45); color: #e8c547; }
        .vote-btn:disabled { cursor: not-allowed; opacity: 0.52; }
        .vote-btn.vote-btn--blocked { background: #1a1a1a; color: #666; border: 1px solid #333; }
        .schedule-form { background: #111; border: 1px solid #1e1e1e; border-radius: 12px; padding: 28px; margin-bottom: 32px; }
        .schedule-empty-hint, .schedule-movie-hint { color: #777; font-size: 14px; line-height: 1.55; margin: 0 0 18px 0; }
        .schedule-movie-hint { margin-bottom: 16px; }
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
        .member-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
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
        {canSendInvites || canManageGroup || canLeaveGroup ? (
          <div className="group-actions">
            <div className="group-actions-row">
              {canSendInvites ? (
                <button className="invite-btn" type="button" onClick={() => setInviteOpen(true)}>
                  + Invite Member
                </button>
              ) : null}
              {canLeaveGroup ? (
                <button type="button" className="leave-header-btn" onClick={handleLeaveGroup}>
                  Leave group
                </button>
              ) : null}
            </div>
            {canManageGroup ? (
              <button className="delete-btn" type="button" onClick={handleDeleteGroup}>
                Delete Group
              </button>
            ) : null}
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
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="content">
        <button className="back-btn" type="button" onClick={onBack}>← Back to My Groups</button>
        {actionMsg ? <p className="msg">{actionMsg}</p> : null}

        <div className="section-intro">
          <h2 className="section-heading">Current Members</h2>
        </div>
        <div className="members-grid" style={{ marginBottom: 24 }}>
          {(activeGroup?.members || []).map((member) => {
            const isSelf = normalizeName(member.name) === normalizeName(currentUserName);
            return (
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
                      {isSelf ? " • You" : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeTab === "recommendations" && (
          <>
            <div className="section-intro">
              <h2 className="section-heading">Top Picks for Your Group</h2>
              <div className="section-intro-meta">
                <span
                  className={`vote-picks-counter${userPicksCount >= MAX_USER_VOTE_PICKS ? " vote-picks-counter--full" : ""}`}
                >
                  Your picks: {userPicksCount} / {MAX_USER_VOTE_PICKS}
                </span>
                <span className="sort-note">Ranked by genre match to members&apos; tastes + catalog</span>
              </div>
            </div>
            <div className="rec-grid">
              {sortedMovies.length === 0 ? (
                <p style={{ color: "#666" }}>No recommendations yet.</p>
              ) : (
                sortedMovies.map((movie) => (
                  <RecommendationCard
                    key={movie.id}
                    movie={movie}
                    maxVotes={maxVotes}
                    onVote={handleVote}
                    expanded={expandedPosterMovieId != null && String(expandedPosterMovieId) === String(movie.id)}
                    onExpandToggle={(intent) => handlePosterExpandIntent(movie.id, intent)}
                    expandFromGridRectRef={expandFromGridRectRef}
                    userPicksCount={userPicksCount}
                    maxUserPicks={MAX_USER_VOTE_PICKS}
                    soleLeaderId={soleLeaderMovieId}
                  />
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "vote" && (
          <>
            <div className="section-intro">
              <h2 className="section-heading">Vote leaderboard</h2>
              <div className="section-intro-meta">
                <span
                  className={`vote-picks-counter${userPicksCount >= MAX_USER_VOTE_PICKS ? " vote-picks-counter--full" : ""}`}
                >
                  Your picks: {userPicksCount} / {MAX_USER_VOTE_PICKS}
                </span>
                <span className="sort-note">
                  Up to 10 titles with at least one vote (highest first). Vote on Recommendations to add titles here.
                </span>
              </div>
            </div>
            <div className="rec-grid">
              {voteTabMovies.length === 0 ? (
                <p style={{ color: "#666" }}>No votes yet. Open the Recommendations tab and vote for picks you want on the shortlist.</p>
              ) : (
                voteTabMovies.map((movie) => (
                  <RecommendationCard
                    key={movie.id}
                    movie={movie}
                    maxVotes={maxVoteTabVotes}
                    onVote={handleVote}
                    expanded={expandedPosterMovieId != null && String(expandedPosterMovieId) === String(movie.id)}
                    onExpandToggle={(intent) => handlePosterExpandIntent(movie.id, intent)}
                    expandFromGridRectRef={expandFromGridRectRef}
                    userPicksCount={userPicksCount}
                    maxUserPicks={MAX_USER_VOTE_PICKS}
                    soleLeaderId={soleLeaderMovieId}
                  />
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "schedule" && (
          <>
            <ScheduleForm onSchedule={handleSchedule} movies={votedMovies} />
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
      </main>
    </>
  );
}
