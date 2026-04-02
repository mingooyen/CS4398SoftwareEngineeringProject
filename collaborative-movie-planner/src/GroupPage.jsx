import { useState } from "react";

// Mock data — replace with API calls
const MOCK_GROUP = {
  id: 1,
  name: "Friday Night Crew",
  members: [
    { id: 1, name: "Mi", avatar: "M", role: "creator" },
    { id: 2, name: "Xavier", avatar: "X", role: "member" },
    { id: 3, name: "Nivah", avatar: "N", role: "member" },
  ],
};

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

function MemberBadge({ member }) {
  return (
    <div className="member-badge" title={member.name}>
      <div className={`avatar ${member.role === "creator" ? "creator" : ""}`}>
        {member.avatar}
      </div>
      <span className="member-name">{member.name}</span>
      {member.role === "creator" && <span className="crown">👑</span>}
    </div>
  );
}

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
  isSystemAdmin = false,
  onOpenAdmin,
}) {
  const [movies, setMovies] = useState(MOCK_RECOMMENDATIONS);
  const [scheduled, setScheduled] = useState(MOCK_SCHEDULED);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [activeNav, setActiveNav] = useState("Groups");

  const navItems = [
    "Home",
    "Groups",
    "Watchlist",
    ...(isSystemAdmin ? ["Admin"] : []),
    "Logout",
  ];
  const maxVotes = Math.max(...movies.map(m => m.votes), 0);

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
    } else if (item === "Admin") {
      onOpenAdmin?.();
    } else {
      setActiveNav(item);
    }
  };

  const goHomeRoot = () => {
    onNavigate("home", { homeTab: "Home" });
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
        .members-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
        .member-badge { display: flex; align-items: center; gap: 6px; }
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: #1e1e1e; border: 1px solid #2e2e2e;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 500; color: #888;
        }
        .avatar.creator { border-color: #e8c547; color: #e8c547; }
        .member-name { font-size: 13px; color: #666; }
        .crown { font-size: 11px; }

        .invite-btn {
          padding: 10px 20px; background: transparent;
          border: 1px solid #2e2e2e; border-radius: 8px;
          color: #888; font-family: 'DM Sans', sans-serif; font-size: 14px;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
          align-self: flex-start; margin-top: 8px;
        }
        .invite-btn:hover { border-color: #e8c547; color: #e8c547; }

        .tabs {
          display: flex; gap: 4px;
          padding: 32px 40px 0;
          border-bottom: 1px solid #1e1e1e;
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
          <h1 className="group-name">{MOCK_GROUP.name}</h1>
          <div className="members-row">
            {MOCK_GROUP.members.map(m => (
              <MemberBadge key={m.id} member={m} />
            ))}
          </div>
        </div>
        <button className="invite-btn">+ Invite Member</button>
      </header>

      {/* TABS */}
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

      {/* CONTENT */}
      <main className="content">

        {activeTab === "recommendations" && (
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

        {activeTab === "vote" && (
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

        {activeTab === "schedule" && (
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
