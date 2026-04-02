import { useEffect } from "react";
import { DEMO_ACCOUNTS } from "./authService.js";

export default function AdminControlsModal({ open, onClose, session }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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
          width: min(520px, 100%);
          max-height: min(90vh, 640px);
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
          margin-bottom: 20px;
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
          font-size: 14px;
          color: #a8a8a8;
          line-height: 1.55;
          margin: 0 0 10px;
        }
        .admin-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .admin-modal-btn {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #3a3a3a;
          background: #1a1a1a;
          color: #ddd;
          font-size: 13px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }
        .admin-modal-btn:hover {
          border-color: #e8c547;
          color: #f0ece4;
        }
        .admin-modal-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .admin-demo-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .admin-demo-table th,
        .admin-demo-table td {
          text-align: left;
          padding: 8px 10px;
          border-bottom: 1px solid #252525;
        }
        .admin-demo-table th {
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 10px;
        }
        .admin-demo-table code {
          font-size: 11px;
          color: #e8c;
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

        <div className="admin-modal-section">
          <h3>Catalog and API (next step)</h3>
          <p className="admin-modal-p">
            Wire these buttons to your backend: global movie catalog (POST{" "}
            <code>/api/v1/movies/catalog</code>), TMDB sync, and group oversight. Mock auth only for
            now.
          </p>
          <div className="admin-modal-actions">
            <button type="button" className="admin-modal-btn" disabled>
              Add movie to global list (API)
            </button>
            <button type="button" className="admin-modal-btn" disabled>
              Refresh catalog from TMDB
            </button>
            <button type="button" className="admin-modal-btn" disabled>
              Export user/group report
            </button>
          </div>
        </div>

        <div className="admin-modal-section">
          <h3>Demo logins (testing)</h3>
          <table className="admin-demo-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ACCOUNTS.map((row) => (
                <tr key={row.username}>
                  <td>{row.displayName}</td>
                  <td>
                    <code>{row.username}</code>
                  </td>
                  <td>
                    <code>{row.password}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
