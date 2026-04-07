import { useMemo, useState } from "react";
import { DEMO_ACCOUNTS } from "./authService.js";

const INITIAL_FORM = {
  username: "",
  password: "",
  fullName: "",
  phoneNumber: "",
  address: "",
  confirmPassword: "",
};

export default function AuthPage({ mode, onSubmit, onModeChange, onBack }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");

  const title = useMemo(
    () => (mode === "signup" ? "Create your account" : "Welcome back"),
    [mode]
  );

  const subtitle = useMemo(
    () =>
      mode === "signup"
        ? "Sign up before accessing group recommendations."
        : "Log in to access your movie profile and activity.",
    [mode]
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (mode === "login") {
      if (!form.username.trim() || !form.password) {
        setError("Please enter username and password.");
        return;
      }
      setError("");
      try {
        onSubmit({
          mode: "login",
          username: form.username.trim(),
          password: form.password,
        });
      } catch (submitError) {
        setError(submitError.message);
      }
      return;
    }

    if (!form.fullName.trim() || !form.phoneNumber.trim() || !form.address.trim()) {
      setError("Please complete full name, phone number, and address.");
      return;
    }
    if (!form.password || !form.confirmPassword) {
      setError("Please enter password and confirm password.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setError("");
    try {
      onSubmit({
        mode: "signup",
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        password: form.password,
      });
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <>
      <style>{`
        .auth-shell {
          min-height: 100vh;
          background: #0d0d0d;
          color: #f0ece4;
          display: grid;
          place-items: center;
          padding: 20px;
          font-family: 'DM Sans', sans-serif;
        }
        .auth-card {
          width: min(560px, 100%);
          background: #121212;
          border: 1px solid #252525;
          border-radius: 14px;
          padding: 32px;
        }
        .auth-logo {
          font-size: 12px;
          letter-spacing: 2px;
          color: #e8c547;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .auth-back {
          background: none;
          border: none;
          color: #c5c5c5;
          cursor: pointer;
          font-size: 13px;
          margin-bottom: 12px;
          padding: 0;
        }
        .auth-back:hover {
          color: #e8c547;
        }
        .auth-title {
          font-size: 34px;
          margin-bottom: 8px;
        }
        .auth-subtitle {
          color: #9e9e9e;
          margin-bottom: 24px;
          font-size: 15px;
        }
        .auth-form {
          display: grid;
          gap: 14px;
        }
        .auth-field {
          display: grid;
          gap: 6px;
        }
        .auth-field label {
          font-size: 12px;
          color: #bbbbbb;
        }
        .auth-field input {
          padding: 11px 12px;
          border: 1px solid #2f2f2f;
          border-radius: 8px;
          background: #1a1a1a;
          color: #f0ece4;
          font-size: 14px;
        }
        .auth-field input:focus {
          outline: none;
          border-color: #e8c547;
        }
        .auth-help {
          margin-top: 8px;
          color: #8a8a8a;
          font-size: 12px;
          line-height: 1.5;
        }
        .auth-switch {
          margin-top: 14px;
          font-size: 13px;
          color: #9e9e9e;
        }
        .auth-switch button {
          background: none;
          border: none;
          color: #e8c547;
          cursor: pointer;
          padding: 0;
          margin-left: 6px;
          font-size: 13px;
        }
        .auth-error {
          color: #ff8f8f;
          font-size: 13px;
        }
        .auth-demo {
          margin-top: 20px;
          padding-top: 18px;
          border-top: 1px solid #2a2a2a;
        }
        .auth-demo-title {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #e8c547;
          margin-bottom: 10px;
        }
        .auth-demo-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .auth-demo-table th,
        .auth-demo-table td {
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1px solid #252525;
          color: #c5c5c5;
        }
        .auth-demo-table th {
          color: #666;
          font-weight: 500;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .auth-demo-table code {
          color: #e8c547;
          font-size: 11px;
        }
        .auth-button {
          margin-top: 6px;
          padding: 12px 14px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          background: #e8c547;
          color: #1a1a1a;
          cursor: pointer;
        }
      `}</style>
      <div className="auth-shell">
        <div className="auth-card">
          <button className="auth-back" type="button" onClick={() => onBack?.()}>
            ← Back to main page
          </button>
          <p className="auth-logo">MovieNight Auth</p>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "login" ? (
              <>
                <div className="auth-field">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    value={form.username}
                    onChange={(event) => handleChange("username", event.target.value)}
                    placeholder="e.g. admin, mi, xavier"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    placeholder="Enter password"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="auth-field">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    value={form.fullName}
                    onChange={(event) => handleChange("fullName", event.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="phoneNumber">Phone number</label>
                  <input
                    id="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(event) => handleChange("phoneNumber", event.target.value)}
                    placeholder="(555) 555-1234"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="address">Address</label>
                  <input
                    id="address"
                    value={form.address}
                    onChange={(event) => handleChange("address", event.target.value)}
                    placeholder="123 Main St, Austin, TX"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => handleChange("password", event.target.value)}
                    placeholder="Create password"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => handleChange("confirmPassword", event.target.value)}
                    placeholder="Confirm password"
                  />
                </div>
              </>
            )}
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="auth-button" type="submit">
              {mode === "signup" ? "Sign up and continue" : "Log in and continue"}
            </button>
          </form>
          <p className="auth-help">
            This page currently uses a frontend mock auth flow. Replace the submit
            handler with backend API calls when auth endpoints are available.
          </p>
          {mode === "login" ? (
            <div className="auth-demo">
              <p className="auth-demo-title">Demo accounts (local only)</p>
              <table className="auth-demo-table">
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
          ) : null}
          <p className="auth-switch">
            {mode === "signup" ? "Already have an account?" : "New here?"}
            <button
              type="button"
              onClick={() => onModeChange?.(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Log in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
