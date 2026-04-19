import { useEffect, useState } from "react";
import {
  addAdminCatalogMovie,
  banUserById,
  readAdminCatalogMovies,
  readBannedIds,
  unbanUserById,
} from "./adminDataStore.js";
import { readGroups, writeGroups } from "./groupDataStore.js";

export default function AdminControlsModal({ open, onClose, session, accessToken = "", onAdminAction }) {
  const [banUserId, setBanUserId] = useState("");
  const [bannedIds, setBannedIds] = useState(() => readBannedIds());
  const [groups, setGroups] = useState(() => readGroups());
  const [removeGroupId, setRemoveGroupId] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [movieYear, setMovieYear] = useState(String(new Date().getFullYear()));
  const [movieGenre, setMovieGenre] = useState("");
  const [moviePosterKey, setMoviePosterKey] = useState("");
  const [movieNotes, setMovieNotes] = useState("");
  const [catalogMsg, setCatalogMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setBannedIds(readBannedIds());
    setGroups(readGroups());
  }, [open]);

  if (!open) return null;

  const notifyParent = () => {
    onAdminAction?.();
  };

  const handleBan = () => {
    const id = banUserId.trim();
    if (!id) {
      setActionMsg("Enter a user ID to ban.");
      return;
    }
    const next = banUserById(id);
    setBannedIds(next);
    setBanUserId("");
    setActionMsg(`Banned user ID: ${id}`);
    notifyParent();
  };

  const handleUnban = (id) => {
    setBannedIds(unbanUserById(id));
    notifyParent();
  };

  const handleRemoveGroup = () => {
    if (!removeGroupId) return;
    const next = groups.filter((g) => g.id !== removeGroupId);
    writeGroups(next);
    setGroups(next);
    setRemoveGroupId("");
    setActionMsg("Removed group from local store.");
    notifyParent();
  };

  const handleAddMovie = async () => {
    if (!movieTitle.trim()) {
      setCatalogMsg("Title is required.");
      return;
    }
    const body = {
      title: movieTitle.trim(),
      releaseYear: Number(movieYear) || undefined,
      genre: movieGenre.trim() || undefined,
      posterStorageKey: moviePosterKey.trim() || undefined,
      adminNotes: movieNotes.trim() || undefined,
      source: "CUSTOM_ADMIN",
    };
    if (accessToken) {
      try {
        const res = await fetch("http://localhost:3000/api/v1/movies/catalog", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          setCatalogMsg(`API error: ${res.status} ${text}`);
          return;
        }
        setCatalogMsg("Movie added to database catalog (POST /movies/catalog).");
        setMovieTitle("");
        setMovieGenre("");
        setMoviePosterKey("");
        setMovieNotes("");
        notifyParent();
        return;
      } catch (e) {
        setCatalogMsg(`Request failed: ${e?.message ?? e}`);
        return;
      }
    }
    addAdminCatalogMovie({
      title: body.title,
      year: body.releaseYear,
      genre: body.genre || "General",
      posterStorageKey: body.posterStorageKey || "",
      adminNotes: body.adminNotes || "",
    });
    setCatalogMsg("Movie saved to local admin catalog.");
    setMovieTitle("");
    setMovieGenre("");
    setMoviePosterKey("");
    setMovieNotes("");
    notifyParent();
  };

  const localCatalog = readAdminCatalogMovies();

  return (
    <div
      className="admin-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      onClick={() => onClose?.()}
    >
      <style>{`
        .admin-modal-root {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          font-family: 'DM Sans', sans-serif;
        }
        .admin-modal-card {
          width: min(560px, 100%);
          max-height: min(92vh, 720px);
          overflow: auto;
          background: #121212;
          border: 1px solid #2a2a2a;
          border-radius: 14px;
          padding: 28px;
          color: #f0ece4;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55);
        }
        .admin-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }
        .admin-modal-title {
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin: 0;
        }
        .admin-modal-tag {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #e8c547;
          margin-top: 4px;
        }
        .admin-modal-close {
          background: #1e1e1e;
          border: 1px solid #333;
          color: #ccc;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          flex-shrink: 0;
        }
        .admin-modal-close:hover {
          border-color: #e8c547;
          color: #e8c547;
        }
        .admin-modal-section {
          margin-bottom: 22px;
        }
        .admin-modal-section h3 {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #888;
          margin: 0 0 10px;
        }
        .admin-modal-p {
          font-size: 13px;
          color: #a8a8a8;
          line-height: 1.55;
          margin: 0 0 10px;
        }
        .admin-modal-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 8px;
        }
        .admin-modal-input,
        .admin-modal-select {
          flex: 1;
          min-width: 140px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #333;
          background: #1a1a1a;
          color: #eee;
          font-size: 13px;
          font-family: inherit;
        }
        .admin-modal-btn {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #3a3a3a;
          background: #1a1a1a;
          color: #ddd;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
        }
        .admin-modal-btn:hover {
          border-color: #e8c547;
          color: #f0ece4;
        }
        .admin-modal-btn-danger {
          border-color: #6a2e2e;
          color: #ff9d9d;
        }
        .admin-ban-list {
          font-size: 12px;
          color: #aaa;
          margin-bottom: 8px;
        }
        .admin-ban-list button {
          margin-left: 8px;
          font-size: 11px;
          cursor: pointer;
          background: none;
          border: none;
          color: #9fd4ff;
          text-decoration: underline;
        }
      `}</style>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <div>
            <p className="admin-modal-tag">System</p>
            <h2 id="admin-modal-title" className="admin-modal-title">
              Admin controls
            </h2>
            <p className="admin-modal-p" style={{ marginTop: "8px", marginBottom: 0 }}>
              Signed in as <strong style={{ color: "#e8c547" }}>{session?.fullName ?? "Admin"}</strong>
            </p>
          </div>
          <button
            type="button"
            className="admin-modal-close"
            onClick={() => onClose?.()}
            aria-label="Close admin panel"
          >
            ×
          </button>
        </div>

        {actionMsg ? (
          <p className="admin-modal-p" style={{ color: "#9fd4ff" }}>
            {actionMsg}
          </p>
        ) : null}

        <div className="admin-modal-section">
          <h3>Ban by user ID</h3>
          <p className="admin-modal-p">
            Hides users from Friends search when their row ID matches. Use the ID shown in Friends
            (demo table below). Persisted as <code>mnp.admin.bannedUserIds</code>; backend should ban
            by <code>User.numericId</code> or <code>User.id</code>.
          </p>
          <div className="admin-modal-row">
            <input
              className="admin-modal-input"
              placeholder="User ID (e.g. 3003 or 1005)"
              value={banUserId}
              onChange={(e) => setBanUserId(e.target.value)}
            />
            <button type="button" className="admin-modal-btn" onClick={handleBan}>
              Ban
            </button>
          </div>
          <div className="admin-ban-list">
            {bannedIds.length === 0 ? (
              <span>No banned IDs.</span>
            ) : (
              bannedIds.map((id) => (
                <div key={id}>
                  <code>{id}</code>
                  <button type="button" onClick={() => handleUnban(id)}>
                    Unban
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-modal-section">
          <h3>Remove group by ID</h3>
          <p className="admin-modal-p">
            Deletes a group from local storage using its <strong>group ID</strong> (see list below or
            Groups page). Backend: <code>DELETE /api/v1/groups/:groupId</code>.
          </p>
          <div className="admin-modal-row">
            <select
              className="admin-modal-select"
              value={removeGroupId}
              onChange={(e) => setRemoveGroupId(e.target.value)}
            >
              <option value="">Select group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — ID: {g.id}
                </option>
              ))}
            </select>
            <button type="button" className="admin-modal-btn admin-modal-btn-danger" onClick={handleRemoveGroup}>
              Remove
            </button>
          </div>
          <div className="admin-modal-row">
            <input
              className="admin-modal-input"
              placeholder="Or type group ID (e.g. g-1)"
              value={removeGroupId}
              onChange={(e) => setRemoveGroupId(e.target.value)}
              style={{ flex: "1 1 100%" }}
            />
          </div>
        </div>

        <div className="admin-modal-section">
          <h3>Add movie to global catalog</h3>
          <p className="admin-modal-p">
            Fields map to <code>MovieCatalogEntry</code>: title, year, genre, poster storage key, admin
            notes. With JWT, POST <code>/api/v1/movies/catalog</code>; otherwise local list.
          </p>
          <div className="admin-modal-row">
            <input
              className="admin-modal-input"
              placeholder="Movie name"
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              style={{ flex: "1 1 100%" }}
            />
          </div>
          <div className="admin-modal-row">
            <input
              className="admin-modal-input"
              placeholder="Year"
              value={movieYear}
              onChange={(e) => setMovieYear(e.target.value)}
            />
            <input
              className="admin-modal-input"
              placeholder="Genre"
              value={movieGenre}
              onChange={(e) => setMovieGenre(e.target.value)}
            />
          </div>
          <div className="admin-modal-row">
            <input
              className="admin-modal-input"
              placeholder="Photo: storage key (e.g. catalog-posters/2026/uuid.jpg)"
              value={moviePosterKey}
              onChange={(e) => setMoviePosterKey(e.target.value)}
              style={{ flex: "1 1 100%" }}
            />
          </div>
          <div className="admin-modal-row">
            <input
              className="admin-modal-input"
              placeholder="Admin notes (stored in adminNotes)"
              value={movieNotes}
              onChange={(e) => setMovieNotes(e.target.value)}
              style={{ flex: "1 1 100%" }}
            />
          </div>
          <button type="button" className="admin-modal-btn" onClick={handleAddMovie}>
            Add movie
          </button>
          {catalogMsg ? (
            <p className="admin-modal-p" style={{ marginTop: "8px", color: "#c8c8c8" }}>
              {catalogMsg}
            </p>
          ) : null}
          <p className="admin-modal-p" style={{ marginTop: "8px", fontSize: "11px" }}>
            Local catalog preview ({localCatalog.length}):{" "}
            {localCatalog.slice(-3).map((m) => m.title).join(", ")}
            {localCatalog.length > 3 ? "…" : ""}
          </p>
        </div>

      </div>
    </div>
  );
}
