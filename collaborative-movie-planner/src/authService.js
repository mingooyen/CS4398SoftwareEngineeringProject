/**
 * Mock auth: login key is optional `username`, else `fullName` (see getLoginKey).
 * Session includes `isSystemAdmin` for UI (platform admin). Replace with API + JWT claims later.
 */
const AUTH_STORAGE_KEY = "mnp.auth.currentUser";
const USER_TABLE_KEY = "mnp.db.users";

/** Shown on Auth page and in the admin panel — demo-only passwords. */
export const DEMO_ACCOUNTS = [
  { displayName: "Admin", username: "admin", password: "password", role: "Platform admin" },
  { displayName: "Mi", username: "mi", password: "mi12345", role: "Friday Night Crew" },
  { displayName: "Xavier", username: "xavier", password: "xavier12345", role: "Friday Night Crew" },
  { displayName: "Nivah", username: "nivah", password: "nivah12345", role: "Friday Night Crew" },
];

const SEED_USERS = [
  {
    userId: "mnp.seed.admin",
    username: "admin",
    fullName: "Admin",
    password: "password",
    isSystemAdmin: true,
    phoneNumber: "—",
    address: "—",
  },
  {
    userId: "mnp.seed.mi",
    username: "mi",
    fullName: "Mi",
    password: "mi12345",
    isSystemAdmin: false,
    phoneNumber: "—",
    address: "—",
  },
  {
    userId: "mnp.seed.xavier",
    username: "xavier",
    fullName: "Xavier",
    password: "xavier12345",
    isSystemAdmin: false,
    phoneNumber: "—",
    address: "—",
  },
  {
    userId: "mnp.seed.nivah",
    username: "nivah",
    fullName: "Nivah",
    password: "nivah12345",
    isSystemAdmin: false,
    phoneNumber: "—",
    address: "—",
  },
];

const emptyActivity = () => ({
  movieRatings: [],
  moviesWatched: [],
  preferences: {
    genres: [],
    languages: [],
    contentRatings: [],
  },
});

/** Default genre tastes for seeded demo users (group recommendations when prefs are empty). */
const SEED_DEFAULT_GENRES = {
  "mnp.seed.admin": ["Documentary", "Drama"],
  "mnp.seed.mi": ["Comedy", "Romance"],
  "mnp.seed.xavier": ["Drama", "Sci-Fi"],
  "mnp.seed.nivah": ["Thriller", "Drama"],
};

function normalizeName(value = "") {
  return value.trim().toLowerCase();
}

/**
 * Directory entries for Friends UI (all demo accounts). IDs are stable mock numeric strings.
 */
export function getDemoDirectoryPeople() {
  return DEMO_ACCOUNTS.map((a, i) => ({
    id: String(3001 + i),
    displayName: a.displayName,
    source: "Directory",
  }));
}

/**
 * Genre preferences for recommendations: stored activity or seed defaults.
 */
export function getGenrePreferencesForDisplayName(displayName) {
  const usersById = loadUserTable();
  const user = Object.values(usersById).find(
    (u) => normalizeName(u.fullName) === normalizeName(displayName)
  );
  const fromDb = user?.activity?.preferences?.genres;
  if (Array.isArray(fromDb) && fromDb.length > 0) {
    return fromDb;
  }
  if (user?.userId && SEED_DEFAULT_GENRES[user.userId]) {
    return SEED_DEFAULT_GENRES[user.userId];
  }
  const seed = SEED_USERS.find((s) => normalizeName(s.fullName) === normalizeName(displayName));
  if (seed && SEED_DEFAULT_GENRES[seed.userId]) {
    return SEED_DEFAULT_GENRES[seed.userId];
  }
  return ["Drama"];
}

export function getLoginKey(user) {
  return (user.username ?? user.fullName).trim().toLowerCase();
}

function ensureSeedUsers(usersById) {
  let changed = false;
  for (const seed of SEED_USERS) {
    const existing = usersById[seed.userId];
    if (!existing || !existing.username || existing.isSystemAdmin == null) {
      const baseActivity = existing?.activity ?? emptyActivity();
      const defaultGenres = SEED_DEFAULT_GENRES[seed.userId] ?? [];
      const mergedPrefs = {
        ...baseActivity.preferences,
        genres:
          Array.isArray(baseActivity.preferences?.genres) &&
          baseActivity.preferences.genres.length > 0
            ? baseActivity.preferences.genres
            : defaultGenres,
      };
      usersById[seed.userId] = {
        ...seed,
        updatedAt: new Date().toISOString(),
        activity: {
          ...baseActivity,
          preferences: mergedPrefs,
        },
      };
      changed = true;
    } else if (
      (!existing.activity?.preferences?.genres ||
        existing.activity.preferences.genres.length === 0) &&
      SEED_DEFAULT_GENRES[seed.userId]?.length
    ) {
      usersById[seed.userId] = {
        ...existing,
        activity: {
          ...existing.activity,
          preferences: {
            ...existing.activity.preferences,
            genres: SEED_DEFAULT_GENRES[seed.userId],
          },
        },
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }
  }
  if (changed) {
    saveUserTable(usersById);
  }
  return usersById;
}

function loadUserTable() {
  const raw = localStorage.getItem(USER_TABLE_KEY);
  let usersById = {};
  if (raw) {
    try {
      usersById = JSON.parse(raw);
      if (!usersById || typeof usersById !== "object") {
        usersById = {};
      }
    } catch {
      usersById = {};
    }
  }
  return ensureSeedUsers(usersById);
}

function saveUserTable(usersById) {
  localStorage.setItem(USER_TABLE_KEY, JSON.stringify(usersById));
}

export function getStoredSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (session?.isAuthenticated && session.fullName?.toLowerCase() === "admin" && session.isSystemAdmin == null) {
      session.isSystemAdmin = true;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function writeSession(userRecord) {
  const session = {
    userId: userRecord.userId,
    fullName: userRecord.fullName,
    phoneNumber: userRecord.phoneNumber,
    address: userRecord.address,
    isAuthenticated: true,
    isSystemAdmin: Boolean(userRecord.isSystemAdmin),
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function registerUser(signupInput) {
  const usersById = loadUserTable();
  const fullName = signupInput.fullName.trim();
  const username = fullName.toLowerCase().replace(/\s+/g, "") || "user";

  const existingUser = Object.values(usersById).find(
    (user) =>
      user.fullName.trim().toLowerCase() === fullName.toLowerCase() ||
      getLoginKey(user) === username
  );
  if (existingUser) {
    throw new Error("An account with this name already exists. Please log in.");
  }

  const userRecord = {
    userId: crypto.randomUUID(),
    username,
    fullName,
    phoneNumber: signupInput.phoneNumber,
    address: signupInput.address,
    password: signupInput.password,
    isSystemAdmin: false,
    updatedAt: new Date().toISOString(),
    activity: {
      movieRatings: [],
      moviesWatched: [],
      preferences: {
        genres: [],
        languages: [],
        contentRatings: [],
      },
    },
  };

  usersById[userRecord.userId] = userRecord;
  saveUserTable(usersById);
  return writeSession(userRecord);
}

export function loginUser(loginInput) {
  const usersById = loadUserTable();
  const normalizedUsername = loginInput.username.trim().toLowerCase();
  const user = Object.values(usersById).find(
    (candidate) => getLoginKey(candidate) === normalizedUsername
  );

  if (!user || user.password !== loginInput.password) {
    throw new Error("Invalid username or password.");
  }

  return writeSession(user);
}
