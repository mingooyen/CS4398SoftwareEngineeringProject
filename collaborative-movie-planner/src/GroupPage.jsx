import { useEffect, useState } from "react";
import {
  acceptInvite,
  acceptFriendRequest,
  DEFAULT_GROUPS,
  denyFriendRequest,
  normalizeName,
  readFriendRequests,
  readGroups,
  readInvites,
  writeGroups,
  writeFriendRequests,
  writeInvites,
} from "./groupDataStore.js";

// Mock data — replace with API calls
const MOCK_GROUP = DEFAULT_GROUPS[0];
const MOCK_PEOPLE = [
  { id: "p-1", name: "Mi", avatar: "M", source: "friend", inGroups: ["Friday Night Crew"] },
  { id: "p-2", name: "Jordan", avatar: "J", source: "other-group", inGroups: ["Saturday Sci-Fi Club"] },
  { id: "p-3", name: "Alex", avatar: "A", source: "other-group", inGroups: ["Saturday Sci-Fi Club"] },
  { id: "p-4", name: "Nivah", avatar: "N", source: "friend", inGroups: ["Friday Night Crew"] },
  { id: "p-5", name: "Terry", avatar: "T", source: "other-group", inGroups: ["Saturday Sci-Fi Club"] },
];

const MOCK_RECOMMENDATIONS = [
  {
    id: 1,
    title: "The Brutalist",
    year: 2024,
    genre: "Drama",
    avgRating: 4.4,
    votes: 2,
    userVoted: false,
    poster: "https://via.placeholder.com/300x450/1a1a1a/e8c547?text=THE+BRUTALIST",
    watched: false,
  },
  {
    id: 2,
    title: "Conclave",
    year: 2024,
    genre: "Thriller",
    avgRating: 4.1,
    votes: 1,
    userVoted: false,
    poster: "https://via.placeholder.com/300x450/1a1a1a/a8c5da?text=CONCLAVE",
    watched: false,
  },
  {
    id: 3,
    title: "Anora",
    year: 2024,
    genre: "Romance",
    avgRating: 3.9,
    votes: 3,
    userVoted: true,
    poster: "https://via.placeholder.com/300x450/1a1a1a/e8a0a0?text=ANORA",
    watched: false,
  },
  {
    id: 4,
    title: "A Real Pain",
    year: 2024,
    genre: "Comedy-Drama",
    avgRating: 4.2,
    votes: 0,
    userVoted: false,
    poster: "https://via.placeholder.com/300x450/1a1a1a/c4e8c4?text=A+REAL+PAIN",
    watched: false,
  },
];

const MOCK_SCHEDULED = [
  {
    id: 1,
    title: "Dune: Part Two",
    date: "2025-03-01",
    time: "19:00",
    location: "Mi's place",
  },
];

// ── Sub-components ──────────────────────────────────────────────

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
        <img src={movie.poster} alt={movie.title} className="rec-poster" />
      </div>
      <div className="rec-body">
        <div className="rec-meta">
          <span className="rec-genre">{movie.genre}</span>
          <span className="rec-year">{movie.year}</span>
        </div>
        <h3 className="rec-title">{movie.title}</h3>
        <div className="rec-rating">
          <span className="stars">{"★".repeat(Math.round(movie.avgRating))}{"☆".repeat(5 - Math.round(movie.avgRating))}</span>
          <span className="rating-num">{movie.avgRating.toFixed(1)} avg</span>
        </div>

        <div className="vote-row">
          <VoteBar votes={movie.votes} max={maxVotes} />
          <span className="vote-count">{movie.votes} vote{movie.votes !== 1 ? "s" : ""}</span>
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

function ScheduleForm({ onSchedule }) {
  const [selectedMovie, setSelectedMovie] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = () => {
    if (!selectedMovie || !date || !time) return;
    onSchedule({ movie: selectedMovie, date, time, location });
    setSelectedMovie(""); setDate(""); setTime(""); setLocation("");
  };

  return (
    <div className="schedule-form">
      <h3 className="form-title">📅 Schedule a Session</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Movie</label>
          <select value={selectedMovie} onChange={e => setSelectedMovie(e.target.value)}>
            <option value="">Select a movie...</option>
            {MOCK_RECOMMENDATIONS.map(m => (
              <option key={m.id} value={m.title}>{m.title}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Location / Link <span className="optional">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Mi's place or zoom.us/..."
            value={location}
            onChange={e => setLocation(e.target.value)}
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

// ── Main Page ───────────────────────────────────────────────────

// ── onNavigate prop added ──
export default function GroupPage({
  onNavigate,
  onLogout,
  highlightedName = "",
  groupTabConfig,
  isSystemAdmin = false,
  onOpenAdmin,
}) {
  const currentUserName = highlightedName?.trim() || "You";
  const currentUserAvatar = currentUserName.charAt(0).toUpperCase();
  const [movies, setMovies] = useState(MOCK_RECOMMENDATIONS);
  const [scheduled, setScheduled] = useState(MOCK_SCHEDULED);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [activeGroupTab, setActiveGroupTab] = useState(
    groupTabConfig?.defaultTab ?? "groups"
  );
  const [activeNav, setActiveNav] = useState("Groups");
  const [allGroups, setAllGroups] = useState(() => readGroups());
  const [selectedGroupId, setSelectedGroupId] = useState("g-1");
  const [newGroupName, setNewGroupName] = useState("");
  const [groupInvites, setGroupInvites] = useState(() => readInvites());
  const [friendRequests, setFriendRequests] = useState(() => readFriendRequests());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");

  const navItems = [
    "Home",
    "Friends",
    "Groups",
    "Watchlist",
    ...(isSystemAdmin ? ["Admin"] : []),
    "Logout",
  ];
  const maxVotes = Math.max(...movies.map(m => m.votes), 0);
  const groupTabs = groupTabConfig?.tabs ?? [
    { id: "groups", label: "Groups" },
    { id: "create-group", label: "Create Group" },
  ];
  const activeGroup =
    allGroups.find((group) => group.id === selectedGroupId) ?? allGroups[0] ?? DEFAULT_GROUPS[0];
  const creatorMember = activeGroup?.members.find((member) => member.role === "creator");
  const isCreator =
    Boolean(creatorMember) &&
    normalizeName(creatorMember.name) === normalizeName(currentUserName);
  const canManageGroup = isSystemAdmin || isCreator;
  const visibleInvites = groupInvites.filter(
    (invite) => normalizeName(invite.invitedUserName) === normalizeName(currentUserName)
  );
  const visibleFriendRequests = friendRequests.filter(
    (req) => normalizeName(req.targetUserName) === normalizeName(currentUserName)
  );
  const normalizedInvite = inviteQuery.trim().toLowerCase();
  const inviteCandidates = MOCK_PEOPLE.filter((person) => {
    const alreadyMember = activeGroup?.members.some(
      (member) => normalizeName(member.name) === normalizeName(person.name)
    );
    if (alreadyMember) return false;
    if (!normalizedInvite) return true;
    return (
      person.name.toLowerCase().includes(normalizedInvite) ||
      person.inGroups.some((group) => group.toLowerCase().includes(normalizedInvite))
    );
  });
  useEffect(() => {
    if (groupTabConfig?.defaultTab) {
      setActiveGroupTab(groupTabConfig.defaultTab);
    }
  }, [groupTabConfig?.defaultTab]);
  useEffect(() => {
    if (!canManageGroup && inviteOpen) {
      setInviteOpen(false);
    }
  }, [canManageGroup, inviteOpen]);
  useEffect(() => {
    writeGroups(allGroups);
  }, [allGroups]);
  useEffect(() => {
    writeInvites(groupInvites);
  }, [groupInvites]);
  useEffect(() => {
    writeFriendRequests(friendRequests);
  }, [friendRequests]);

  const handleVote = (movieId) => {
    // Database integration hook:
    // send { userId, groupId, movieId, voteType: "upvote", createdAt }.
    setMovies(prev =>
      prev.map(m =>
        m.id === movieId ? { ...m, votes: m.votes + 1, userVoted: true } : m
      )
    );
  };

  const handleSchedule = ({ movie, date, time, location }) => {
    // Database integration hook:
    // send { groupId, movieId/title, scheduledDate, scheduledTime, location, createdByUserId }.
    setScheduled(prev => [
      ...prev,
      { id: Date.now(), title: movie, date, time, location },
    ]);
    setActiveTab("schedule");
  };

  // ── Routes nav clicks to the right page or tab ──
  const handleNavClick = (item) => {
    if (item === "Home") {
      onNavigate("home", { homeTab: "Home" });
    } else if (item === "Watchlist") {
      onNavigate("home", { homeTab: "Watchlist" });
    } else if (item === "Logout") {
      onLogout();
    } else if (item === "Groups") {
      setActiveNav("Groups");
    } else if (item === "Friends") {
      setInviteOpen(true);
    } else if (item === "Admin") {
      onOpenAdmin?.();
    } else {
      setActiveNav(item);
    }
  };

  const goHomeRoot = () => {
    onNavigate("home", { homeTab: "Home" });
  };
  const handleCreateGroup = () => {
    const nextName = newGroupName.trim();
    if (!nextName) return;
    setAllGroups((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}`,
        name: nextName,
        members: [
          {
            id: Date.now(),
            name: currentUserName,
            avatar: currentUserAvatar,
            role: "creator",
          },
        ],
      },
    ]);
    setNewGroupName("");
    setActiveGroupTab("groups");
  };
  const handleDeleteGroup = (groupId) => {
    const targetGroup = allGroups.find((group) => group.id === groupId);
    if (!targetGroup) return;
    const targetCreator = targetGroup.members.find((member) => member.role === "creator");
    const canDeleteTarget =
      isSystemAdmin ||
      (targetCreator &&
        normalizeName(targetCreator.name) === normalizeName(currentUserName));
    if (!canDeleteTarget) return;

    setAllGroups((prev) => {
      const remaining = prev.filter((group) => group.id !== groupId);
      if (selectedGroupId === groupId && remaining.length > 0) {
        setSelectedGroupId(remaining[0].id);
      }
      return remaining;
    });
  };
  const handleRemoveMember = (groupId, memberId) => {
    setAllGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          members: group.members.filter((member) => member.id !== memberId),
        };
      })
    );
  };
  const handleInviteMember = (person) => {
    if (!activeGroup) return;
    const alreadyMember = activeGroup.members.some(
      (member) => normalizeName(member.name) === normalizeName(person.name)
    );
    if (alreadyMember) return;
    const duplicateInvite = groupInvites.some(
      (invite) =>
        invite.groupId === activeGroup.id &&
        normalizeName(invite.invitedUserName) === normalizeName(person.name)
    );
    if (duplicateInvite) return;
    setGroupInvites((prev) => [
      ...prev,
      {
        id: `gi-${Date.now()}-${person.id}`,
        groupId: activeGroup.id,
        groupName: activeGroup.name,
        invitedUserName: person.name,
        inviterName: currentUserName,
      },
    ]);
  };
  const handleJoinInvite = (inviteId) => {
    acceptInvite(inviteId, currentUserName);
    setAllGroups(readGroups());
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

  const sortedMovies = [...movies].sort((a, b) => b.avgRating - a.avgRating);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; color: #f0ece4; font-family: 'DM Sans', sans-serif; min-height: 100vh; }

        .nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,13,13,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #1e1e1e;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 64px;
        }
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
        .notif-btn:hover { border-color: #4a4a4a; color: #f0ece4; }
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
        .notif-title {
          font-size: 12px;
          color: #8f8f8f;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
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
        .notif-meta { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .notif-text { min-width: 0; }
        .notif-main {
          font-size: 13px;
          color: #e4e4e4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .notif-sub {
          font-size: 11px;
          color: #7a7a7a;
        }
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
        .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 2px; color: #e8c547; }
        .nav-logo span { color: #f0ece4; }
        .nav-links { display: flex; gap: 8px; }
        .nav-link {
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          color: #888; padding: 8px 16px; border-radius: 6px;
          transition: color 0.2s, background 0.2s; letter-spacing: 0.5px;
        }
        .nav-link:hover { color: #f0ece4; background: #1a1a1a; }
        .nav-link.active { color: #e8c547; background: rgba(232,197,71,0.08); }

        .page-header {
          padding: 48px 40px 0;
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 24px;
        }
        .group-meta { display: flex; flex-direction: column; gap: 8px; }
        .group-label {
          font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
          color: #e8c547; font-weight: 500;
        }
        .group-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 5vw, 56px);
          letter-spacing: 2px; color: #f0ece4; line-height: 1;
        }
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: #1e1e1e; border: 1px solid #2e2e2e;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 500; color: #888;
        }
        .avatar.creator { border-color: #e8c547; color: #e8c547; }
        .avatar.current-user {
          border-color: #58a6ff;
          color: #9fd4ff;
          box-shadow: 0 0 0 2px rgba(88,166,255,0.25);
        }
        .crown { font-size: 11px; }

        .invite-btn {
          padding: 10px 20px; background: transparent;
          border: 1px solid #2e2e2e; border-radius: 8px;
          color: #888; font-family: 'DM Sans', sans-serif; font-size: 14px;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
          align-self: flex-start; margin-top: 8px;
        }
        .invite-btn:hover { border-color: #e8c547; color: #e8c547; }
        .invite-overlay {
          position: fixed;
          inset: 0;
          z-index: 210;
          background: rgba(0, 0, 0, 0.72);
          display: grid;
          place-items: center;
          padding: 20px;
        }
        .invite-modal {
          width: min(620px, 100%);
          max-height: 85vh;
          overflow: auto;
          background: #121212;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          padding: 18px;
        }
        .invite-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .invite-title { font-size: 17px; color: #f0ece4; }
        .invite-close {
          background: #1e1e1e;
          color: #bbb;
          border: 1px solid #343434;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          cursor: pointer;
        }
        .invite-search {
          width: 100%;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #f0ece4;
          padding: 10px 12px;
          font-size: 14px;
          margin-bottom: 14px;
        }
        .invite-list {
          display: grid;
          gap: 10px;
        }
        .invite-person {
          border: 1px solid #252525;
          border-radius: 10px;
          background: #111;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .invite-person-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .invite-person-name { color: #f0ece4; font-size: 14px; }
        .invite-person-sub { color: #7b7b7b; font-size: 12px; }
        .invite-add-btn {
          border: 1px solid #2f6f95;
          color: #9fd4ff;
          background: transparent;
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 12px;
        }

        .tabs {
          display: flex; gap: 4px;
          padding: 32px 40px 0;
          border-bottom: 1px solid #1e1e1e;
        }
        .group-tabs {
          display: flex;
          gap: 8px;
          padding: 24px 40px 0;
          border-bottom: 1px solid #1e1e1e;
        }
        .group-tab {
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #777;
          padding: 10px 14px;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s;
        }
        .group-tab.active {
          background: rgba(232,197,71,0.12);
          color: #e8c547;
        }
        .groups-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }
        .group-card {
          background: #121212;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 0;
          position: relative;
          overflow: hidden;
        }
        .group-enter-card {
          width: 100%;
          height: 100%;
          text-align: left;
          background: #121212;
          border: none;
          border-radius: 0;
          padding: 14px;
          cursor: pointer;
          display: block;
        }
        .group-enter-card:hover {
          border-color: #2f6f95;
          background: #151515;
        }
        .group-enter-card.active {
          border-color: #2f5f95;
          box-shadow: 0 0 0 1px rgba(47, 95, 149, 0.35);
        }
        .group-card-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 3;
        }
        .group-delete-btn {
          padding: 6px 10px;
          border: 1px solid #7a2b2b;
          border-radius: 7px;
          background: transparent;
          color: #ff8f8f;
          font-size: 12px;
          cursor: pointer;
        }
        .group-delete-btn:hover {
          border-color: #c43b3b;
          color: #ffc1c1;
          background: rgba(196, 59, 59, 0.08);
        }
        .group-card-title { font-size: 15px; color: #f0ece4; margin-bottom: 6px; }
        .group-card-meta { font-size: 12px; color: #7a7a7a; }
        .member-card {
          background: #121212;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .member-card-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .member-card-name { font-size: 14px; color: #f0ece4; }
        .member-card-name .crown-inline { margin-left: 6px; }
        .member-card-role { font-size: 11px; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.7px; }
        .member-remove-btn {
          padding: 6px 10px;
          border: 1px solid #444;
          border-radius: 7px;
          background: transparent;
          color: #bdbdbd;
          font-size: 12px;
          cursor: pointer;
        }
        .member-remove-btn:hover {
          border-color: #c43b3b;
          color: #ffc1c1;
          background: rgba(196, 59, 59, 0.08);
        }
        .create-group-panel {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 12px;
          padding: 18px;
          max-width: 520px;
        }
        .create-group-panel h3 { margin-bottom: 10px; font-size: 15px; color: #f0ece4; }
        .create-group-panel input {
          width: 100%;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #f0ece4;
          font-size: 14px;
          padding: 10px 12px;
          margin-bottom: 12px;
        }
        .create-group-panel button {
          padding: 10px 14px;
          border: 1px solid #e8c547;
          background: transparent;
          color: #e8c547;
          border-radius: 8px;
          cursor: pointer;
        }
        .tab {
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          color: #555; padding: 10px 20px;
          border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
          margin-bottom: -1px;
        }
        .tab:hover { color: #f0ece4; }
        .tab.active { color: #e8c547; border-bottom-color: #e8c547; }

        .content { padding: 36px 40px 80px; }

        .section-intro {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px;
        }
        .section-heading {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px; letter-spacing: 2px; color: #f0ece4;
        }
        .sort-note { font-size: 12px; color: #555; font-style: italic; }

        .rec-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }

        .rec-card {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.2s;
          position: relative;
        }
        .rec-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.5);
          border-color: #2e2e2e;
        }
        .rec-card.leading {
          border-color: rgba(232,197,71,0.35);
          box-shadow: 0 0 0 1px rgba(232,197,71,0.1);
        }
        .leading-badge {
          position: absolute; top: 12px; left: 12px; z-index: 2;
          background: rgba(232,197,71,0.9); color: #0d0d0d;
          font-size: 11px; font-weight: 500; padding: 4px 10px;
          border-radius: 20px; letter-spacing: 0.5px;
        }

        .rec-poster-wrap { aspect-ratio: 16/9; overflow: hidden; }
        .rec-poster { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
        .rec-card:hover .rec-poster { transform: scale(1.04); }

        .rec-body { padding: 16px; }
        .rec-meta { display: flex; gap: 8px; margin-bottom: 6px; }
        .rec-genre {
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          color: #e8c547; background: rgba(232,197,71,0.08);
          padding: 3px 8px; border-radius: 4px;
        }
        .rec-year { font-size: 12px; color: #555; align-self: center; }
        .rec-title { font-size: 17px; font-weight: 500; color: #f0ece4; margin-bottom: 8px; }
        .rec-rating { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .stars { color: #e8c547; font-size: 13px; letter-spacing: 1px; }
        .rating-num { font-size: 12px; color: #666; }

        .vote-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .vote-bar-track {
          flex: 1; height: 4px; background: #1e1e1e; border-radius: 2px; overflow: hidden;
        }
        .vote-bar-fill {
          height: 100%; background: #e8c547; border-radius: 2px;
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
        }
        .vote-count { font-size: 12px; color: #555; white-space: nowrap; }

        .vote-btn {
          width: 100%; padding: 10px;
          background: #e8c547; color: #0d0d0d;
          border: none; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          cursor: pointer; transition: background 0.2s, opacity 0.2s;
          letter-spacing: 0.5px;
        }
        .vote-btn:hover:not(:disabled) { background: #f0d060; }
        .vote-btn.voted {
          background: #1e1e1e; color: #666; cursor: default;
          border: 1px solid #2e2e2e;
        }
        .vote-btn:disabled { opacity: 0.7; }

        .schedule-form {
          background: #111; border: 1px solid #1e1e1e; border-radius: 12px;
          padding: 28px; margin-bottom: 32px;
        }
        .form-title {
          font-size: 16px; font-weight: 500; color: #f0ece4;
          margin-bottom: 20px; letter-spacing: 0.3px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px; margin-bottom: 20px;
        }
        .form-field { display: flex; flex-direction: column; gap: 6px; }
        .form-field label {
          font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
          color: #666; font-weight: 500;
        }
        .optional { color: #444; font-size: 10px; letter-spacing: 0; text-transform: none; }
        .form-field input,
        .form-field select {
          background: #161616; border: 1px solid #2a2a2a;
          border-radius: 8px; color: #f0ece4;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          padding: 10px 14px; outline: none;
          transition: border-color 0.2s;
          appearance: auto;
        }
        .form-field input::placeholder { color: #444; }
        .form-field input:focus,
        .form-field select:focus { border-color: #e8c547; }
        .form-field select option { background: #161616; }

        .schedule-btn {
          padding: 12px 28px;
          background: transparent;
          border: 1px solid #e8c547;
          color: #e8c547;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          cursor: pointer; letter-spacing: 0.5px;
          transition: background 0.2s, color 0.2s;
        }
        .schedule-btn:hover { background: #e8c547; color: #0d0d0d; }

        .upcoming-list { display: flex; flex-direction: column; gap: 12px; }
        .upcoming-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 12px;
          padding: 20px 24px;
          display: flex; align-items: center; gap: 20px;
          transition: border-color 0.2s;
        }
        .upcoming-card:hover { border-color: #2e2e2e; }
        .upcoming-date {
          display: flex; flex-direction: column; align-items: center;
          min-width: 48px;
          background: rgba(232,197,71,0.08);
          border: 1px solid rgba(232,197,71,0.15);
          border-radius: 8px; padding: 8px;
        }
        .up-month { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #e8c547; }
        .up-day { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #f0ece4; line-height: 1; }
        .upcoming-info { flex: 1; }
        .upcoming-movie { font-size: 16px; font-weight: 500; color: #f0ece4; margin-bottom: 4px; }
        .upcoming-time { font-size: 13px; color: #666; margin-bottom: 2px; }
        .upcoming-loc { font-size: 12px; color: #555; }
        .upcoming-badge {
          font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
          color: #e8c547; background: rgba(232,197,71,0.08);
          border: 1px solid rgba(232,197,71,0.2);
          padding: 4px 10px; border-radius: 20px;
        }

        .empty-state {
          text-align: center; padding: 60px 20px; color: #444;
        }
        .empty-icon { font-size: 40px; margin-bottom: 12px; }
        .empty-state p { font-size: 15px; }

        @media (max-width: 600px) {
          .nav, .page-header, .tabs, .content { padding-left: 20px; padding-right: 20px; }
          .tabs { overflow-x: auto; }
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
                      <div className="avatar">{invite.groupName.charAt(0)}</div>
                      <div className="notif-text">
                        <p className="notif-main">You are invited to join</p>
                        <p className="notif-sub">
                          {invite.groupName} - Invited by {invite.inviterName}
                        </p>
                      </div>
                    </div>
                    <div className="notif-actions">
                      <button
                        type="button"
                        className="notif-approve"
                        onClick={() => handleJoinInvite(invite.id)}
                      >
                        Join
                      </button>
                      <button
                        type="button"
                        className="notif-deny"
                        onClick={() => handleDenyInvite(invite.id)}
                      >
                        Deny
                      </button>
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
                    <div className="notif-meta">
                      <div className="avatar">{req.requesterName.charAt(0)}</div>
                      <div className="notif-text">
                        <p className="notif-main">{req.requesterName} sent you a friend request</p>
                        <p className="notif-sub">Requester ID: {req.requesterId}</p>
                      </div>
                    </div>
                    <div className="notif-actions">
                      <button
                        type="button"
                        className="notif-approve"
                        onClick={() => handleAcceptFriendRequest(req.id)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="notif-deny"
                        onClick={() => handleDenyFriendRequest(req.id)}
                      >
                        Deny
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
          {navItems.map(item => (
            <button
              key={item}
              className={`nav-link ${item === "Admin" ? "" : activeNav === item ? "active" : ""}`}
              onClick={() => handleNavClick(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>

      {/* PAGE HEADER */}
      <header className="page-header">
        <div className="group-meta">
          <span className="group-label">Group</span>
          <h1 className="group-name">{activeGroup?.name ?? MOCK_GROUP.name}</h1>
        </div>
        {canManageGroup ? (
          <button className="invite-btn" type="button" onClick={() => setInviteOpen(true)}>
            + Invite Member
          </button>
        ) : null}
      </header>
      {inviteOpen && canManageGroup ? (
        <div className="invite-overlay" onClick={() => setInviteOpen(false)}>
          <div className="invite-modal" onClick={(event) => event.stopPropagation()}>
            <div className="invite-head">
              <h3 className="invite-title">Invite Member to {activeGroup?.name}</h3>
              <button className="invite-close" type="button" onClick={() => setInviteOpen(false)}>
                ×
              </button>
            </div>
            <input
              className="invite-search"
              type="text"
              placeholder="Search friends or people from other groups..."
              value={inviteQuery}
              onChange={(event) => setInviteQuery(event.target.value)}
            />
            <div className="invite-list">
              {inviteCandidates.map((person) => (
                <div className="invite-person" key={person.id}>
                  <div className="invite-person-meta">
                    <div className="avatar">{person.avatar}</div>
                    <div>
                      <p className="invite-person-name">{person.name}</p>
                      <p className="invite-person-sub">
                        {person.source === "friend" ? "Friend" : "Other groups"} - {person.inGroups.join(", ")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="invite-add-btn"
                    onClick={() => handleInviteMember(person)}
                  >
                    Send invite
                  </button>
                </div>
              ))}
              {inviteCandidates.length === 0 ? (
                <div className="group-card">
                  <p className="group-card-meta">No matching people found.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* TABS */}
      <div className="group-tabs">
        {groupTabs.map((tab) => (
          <button
            key={tab.id}
            className={`group-tab ${activeGroupTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveGroupTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeGroupTab === "groups" ? (
      <div className="tabs">
        {[
          { id: "recommendations", label: "🎬 Recommendations" },
          { id: "vote", label: "🗳️ Vote" },
          { id: "schedule", label: "📅 Schedule" },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      ) : null}

      {/* CONTENT */}
      <main className="content">
        {activeGroupTab === "groups" ? (
          <div className="section-intro">
            <h2 className="section-heading">Your Groups</h2>
          </div>
        ) : null}
        {activeGroupTab === "groups" ? (
          <>
            <div className="groups-list" style={{ marginBottom: "26px" }}>
              {allGroups.map((group) => (
                <div className="group-card" key={group.id}>
                  <div className="group-card-actions">
                    {(() => {
                      const groupCreator = group.members.find((member) => member.role === "creator");
                      const canDelete =
                        isSystemAdmin ||
                        (groupCreator &&
                          normalizeName(groupCreator.name) === normalizeName(currentUserName));
                      return canDelete ? (
                        <button
                          type="button"
                          className="group-delete-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                        >
                          Delete
                        </button>
                      ) : null;
                    })()}
                  </div>
                  <button
                    type="button"
                    className={`group-enter-card ${selectedGroupId === group.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setActiveGroupTab("groups");
                    }}
                  >
                    <p className="group-card-title">{group.name}</p>
                    <p className="group-card-meta">{group.members.length} members</p>
                  </button>
                </div>
              ))}
            </div>
            {activeGroup ? (
              <div className="section-intro" style={{ marginTop: "8px" }}>
                <h2 className="section-heading">Members in {activeGroup.name}</h2>
              </div>
            ) : null}
            {activeGroup ? (
              <div className="groups-list" style={{ marginBottom: "26px" }}>
                {activeGroup.members.map((member) => (
                  <div className="member-card" key={`${activeGroup.id}-${member.id}`}>
                    <div className="member-card-left">
                      <div
                        className={`avatar ${member.role === "creator" ? "creator" : ""} ${
                          normalizeName(member.name) === normalizeName(currentUserName) ? "current-user" : ""
                        }`}
                      >
                        {member.avatar}
                      </div>
                      <div>
                        <p className="member-card-name">
                          {member.name}
                          {member.role === "creator" ? (
                            <span className="crown-inline" title="Group creator">👑</span>
                          ) : null}
                        </p>
                        <p className="member-card-role">{member.role}</p>
                      </div>
                    </div>
                    {canManageGroup && member.role !== "creator" ? (
                      <button
                        type="button"
                        className="member-remove-btn"
                        onClick={() => handleRemoveMember(activeGroup.id, member.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="create-group-panel">
            <h3>Create Group</h3>
            <input
              type="text"
              placeholder="Enter group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button type="button" onClick={handleCreateGroup}>Create Group</button>
          </div>
        )}

        {activeGroupTab === "groups" && activeTab === "recommendations" && (
          <>
            <div className="section-intro">
              <h2 className="section-heading">Top Picks for Your Group</h2>
              <span className="sort-note">Sorted by avg group rating</span>
            </div>
            <div className="rec-grid">
              {sortedMovies.map(movie => (
                <RecommendationCard key={movie.id} movie={movie} maxVotes={maxVotes} onVote={handleVote} />
              ))}
            </div>
          </>
        )}

        {activeGroupTab === "groups" && activeTab === "vote" && (
          <>
            <div className="section-intro">
              <h2 className="section-heading">Cast Your Vote</h2>
              <span className="sort-note">One vote per movie</span>
            </div>
            <div className="rec-grid">
              {[...movies].sort((a, b) => b.votes - a.votes).map(movie => (
                <RecommendationCard key={movie.id} movie={movie} maxVotes={maxVotes} onVote={handleVote} />
              ))}
            </div>
          </>
        )}

        {activeGroupTab === "groups" && activeTab === "schedule" && (
          <>
            <ScheduleForm onSchedule={handleSchedule} />
            <div className="section-intro" style={{ marginTop: "8px" }}>
              <h2 className="section-heading">Upcoming Sessions</h2>
            </div>
            {scheduled.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗓️</div>
                <p>No sessions scheduled yet.</p>
              </div>
            ) : (
              <div className="upcoming-list">
                {scheduled.map(s => (
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
