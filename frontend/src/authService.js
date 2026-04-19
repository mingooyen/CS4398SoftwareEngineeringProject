const AUTH_STORAGE_KEY = "mnp.auth.currentUser";
const API_BASE = "http://localhost:3000/api/v1/auth";

export const DEMO_ACCOUNTS = [
  { displayName: "Admin", username: "admin", email: "admin@movienight.local", password: "password", role: "Platform admin" },
  { displayName: "Mi", username: "mi", email: "mi@movienight.local", password: "mi12345", role: "Member" },
  { displayName: "Xavier", username: "xavier", email: "xavier@movienight.local", password: "xavier12345", role: "Member" },
];

const DEMO_DEFAULT_GENRES = {
  admin: ["Documentary", "Drama"],
  mi: ["Comedy", "Romance"],
  xavier: ["Drama", "Sci-Fi"],
};

function normalizeName(value = "") {
  return value.trim().toLowerCase();
}

/** Demo / legacy fallback when we only have a display name (e.g. group picks). Returns [] if unknown—callers should treat empty as “no genre bias”. */
export function getGenrePreferencesForDisplayName(displayName) {
  const key = normalizeName(displayName);
  if (DEMO_DEFAULT_GENRES[key]) return DEMO_DEFAULT_GENRES[key];
  return [];
}

function mapLoginToEmail(usernameOrEmail = "") {
  const trimmed = usernameOrEmail.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  const demo = DEMO_ACCOUNTS.find((x) => x.username === trimmed);
  if (demo) return demo.email;
  return `${trimmed}@movienight.local`;
}

function saveSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function toSession(payload) {
  return {
    userId: payload.user.id,
    fullName: payload.user.displayName,
    email: payload.user.email,
    isAuthenticated: true,
    isSystemAdmin: payload.user.systemRole === "SYSTEM_ADMIN",
    accessToken: payload.accessToken,
    loggedInAt: new Date().toISOString(),
  };
}

export async function registerUser(signupInput) {
  const email =
    signupInput.email?.trim().toLowerCase() ||
    `${signupInput.fullName.trim().toLowerCase().replace(/\s+/g, ".")}@movienight.local`;
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: signupInput.password,
      displayName: signupInput.fullName.trim(),
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || "Unable to create account.");
  return saveSession(toSession(payload));
}

export async function loginUser(loginInput) {
  const email = mapLoginToEmail(loginInput.username);
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: loginInput.password,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || "Invalid email or password.");
  return saveSession(toSession(payload));
}
