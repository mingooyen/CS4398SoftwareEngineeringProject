import { useState } from "react";

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
  isAuthenticated,
  isSystemAdmin = false,
  onOpenAdmin,
  homeNav,
  onHomeNavChange,
}) {
  const [query, setQuery] = useState("");
  const [ratings, setRatings] = useState({});
  const [watchlistIds, setWatchlistIds] = useState([]);

  const navItems = isAuthenticated
    ? [
        "Home",
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
    } else {
      onHomeNavChange(item);
    }
  };

  const goHomeRoot = () => {
    onNavigate("home", { homeTab: "Home" });
  };

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
        .nav-links { display: flex; gap: 8px; }
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
        <span className="result-count">{filtered.length} movies</span>
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
    </>
  );
}
