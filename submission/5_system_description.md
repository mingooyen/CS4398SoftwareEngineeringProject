# Textual Description of System Structure and Algorithms

## 1. Overall Architecture

Movie Night Planner is a full-stack web application built as a monorepo with three top-level packages:

| Package | Technology | Purpose |
|---------|-----------|---------|
| `frontend/` | React 19 + Vite | Single-page application (SPA) served by Vite dev server |
| `backend/` | Node.js + Express + TypeScript | RESTful API server |
| `database/` | Prisma ORM + MongoDB | Schema definition and migrations |

Communication is via HTTP/REST. The frontend calls the backend at `http://localhost:3000/api/v1`. Authentication is cookie-based (httpOnly JWT cookies).

---

## 2. Backend Layer Structure

The backend enforces a strict one-way dependency chain:

```
HTTP Request
    │
    ▼
Routes          (bind URL patterns to middleware + controller)
    │
    ▼
Middleware      (auth, RBAC, validation, rate-limiting)
    │
    ▼
Controllers     (parse HTTP input, call service, serialize HTTP output)
    │
    ▼
Services        (business logic, orchestration)
    │
    ▼
Repositories    (database access via Prisma)
    │
    ▼
MongoDB (via Prisma ORM)
```

**Routes** (`backend/src/routes/api/v1/`) define the endpoint path, attach middleware, and delegate to a controller method. They contain no business logic.

**Middleware** handles cross-cutting concerns:
- `auth.ts` — extracts the JWT access token from the cookie or Authorization header, verifies it, and attaches `userId` to `req`.
- `rbac.ts` — `requireGroupAdmin` queries the `GroupMember` table to verify the requesting user has ADMIN role in the target group. `requireSystemAdmin` checks `User.systemRole`.
- `group-access.ts` — `loadGroupOnly` fetches the group by `:groupId` param and attaches it to `req`. `requireGroupParticipant` additionally verifies the user is a member.
- `validate.ts` — wraps Zod schemas to validate `req.body` or `req.query` before the controller runs.
- `error-handler.ts` — maps typed `AppError` subclasses (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`) to HTTP status codes (401, 403, 404, 422). In production, strips stack traces.

**Controllers** are thin HTTP adapters. They extract path params, query params, and validated body from `req`, call exactly one service method, and send the response.

**Services** contain all business rules. They call one or more repositories and may call external APIs (TMDB, OpenAI). Services do not touch `req` or `res`.

**Repositories** wrap Prisma calls. Each repository is responsible for one model (e.g., `group-repository.ts` wraps all `prisma.group.*` operations). This isolates Prisma from business logic and makes services unit-testable with mocked repositories.

---

## 3. Frontend Structure

The frontend is a React SPA. Navigation between major views is managed in `App.jsx` with conditional rendering. Key modules:

| Module | Responsibility |
|--------|---------------|
| `authService.js` | Login, register, logout, token refresh via fetch calls to `/api/v1/auth/*` |
| `groupDataStore.js` | All group, session, vote, and recommendation API calls; caches group state in memory |
| `adminDataStore.js` | System-admin API calls (catalog management, user lookup) |
| `recommendationUtils.js` | Offline scoring fallback when AI endpoint is unavailable |
| `posterUtils.js` | Constructs TMDB image URLs from `posterPath` values |
| `offlineCatalog.js` | Hardcoded fallback movie list for demo / development without a DB |
| `presence-store.ts` (backend) | In-memory map of `userId → lastSeenAt`; powers online indicators |

---

## 4. Database Design

The database uses MongoDB accessed through Prisma ORM. Key design decisions:

- **Movies are not stored as rows.** All movie data is fetched on-demand from the TMDB API. Only the integer `tmdbId` is persisted in `WatchlistEntry`, `WatchedEntry`, `Session`, and `Vote` records. This avoids the need to synchronize a movie table with an external source.
- **`MovieCatalogEntry`** is the exception — it is a platform-admin-curated catalog for browse and recommendation scoring, with optional TMDB metadata.
- **`GroupMember`** is a junction table between `User` and `Group` with a `role` field (MEMBER or ADMIN). The group creator is inserted as ADMIN when the group is created.
- **`Friendship`** uses a directed edge model (requester → addressee) with a `FriendshipStatus` enum. Application logic treats ACCEPTED friendships as bidirectional.
- **Cascading deletes** are used throughout (e.g., deleting a Group cascades to GroupMember, Session, Vote, GroupInvite records).

---

## 5. Authentication Algorithm

The system uses a dual-token JWT flow:

1. **Access token** — Short-lived (e.g., 15 minutes), signed with `JWT_SECRET`. Sent as a httpOnly cookie. Contains `{ userId }` payload. Verified by the `authenticate` middleware on every protected request.

2. **Refresh token** — Long-lived (e.g., 7 days), signed with `JWT_REFRESH_SECRET`. Stored as a hash in the `RefreshToken` table with an `expiresAt` and nullable `revokedAt`. Sent as a separate httpOnly cookie.

**Refresh rotation algorithm:**
```
POST /auth/refresh:
  1. Read refresh token from cookie.
  2. Verify JWT signature and expiry.
  3. Look up token in RefreshToken table; check revokedAt is null and expiresAt > now.
  4. Revoke the old RefreshToken row (set revokedAt = now).
  5. Issue a new access token and a new refresh token.
  6. Insert new RefreshToken row.
  7. Set both new tokens as httpOnly cookies.
```

This one-time-use rotation means a stolen refresh token can only be used once — the next legitimate refresh will find the row already revoked and invalidate the session.

---

## 6. AI Recommendation Algorithm

The recommendation engine (`services/ai/recommendation-engine.ts`) generates movie suggestions for a group:

```
getGroupRecommendations(groupId):
  1. Fetch all GroupMember records for the group.
  2. For each member, fetch:
       a. WatchedEntry[] (movies they have seen + ratings)
       b. WatchlistEntry[] (movies they want to see)
       c. UserPreferences.favoriteGenres
  3. Aggregate:
       a. "Seen by all": intersection of each member's watched tmdbIds.
       b. "Unseen by all": movies in any member's watchlist that NO member has watched.
       c. "Partial overlap": movies seen by some but not all members.
  4. Build a RecommendationInput payload summarizing:
       - Member watch histories and ratings
       - Collective favorite genres
       - Already-seen movies to exclude
  5. Call OpenAI (via recommendation-engine.ts) with a structured prompt:
       "Given these group members' preferences and watched histories,
        suggest N movies to watch together. Prioritize movies unwatched by
        all members. Return JSON: [{ tmdbId, title, score, explanation }]"
  6. Parse and validate the OpenAI JSON response.
  7. Sort by score descending and return.
```

**Fallback:** If the AI call fails or the API key is not configured, `recommendationUtils.js` (frontend) applies a simpler genre-matching score against the offline catalog.

---

## 7. Vote Aggregation Algorithm

Vote results are computed on-the-fly (not stored) by `vote-service.ts`:

```
getResults(groupId, sessionId):
  1. Fetch all Vote rows for the sessionId.
  2. Group votes by movieTmdbId using a Map<tmdbId, count>.
  3. Sort entries by count descending.
  4. Return VoteResult[]: [{ movieTmdbId, voteCount }]
```

There is no stored "winner" — the admin views the results and manually selects the movie via `PATCH /sessions/:id`. This allows late votes to continue influencing the recommendation until the admin locks in a choice.

---

## 8. Security Measures

- **Helmet** — sets Content-Security-Policy, X-Frame-Options, and other security headers.
- **CORS allowlist** — only origins listed in `CORS_ORIGINS` env var are permitted (defaults to `localhost` for dev).
- **Rate limiting** — `authRateLimiter` allows fewer requests per IP on `/auth/*` endpoints to slow brute-force attacks.
- **Zod validation** — all incoming request bodies and query strings are parsed against Zod schemas before reaching controllers. Invalid payloads receive a 422 with field-level errors.
- **Password hashing** — bcrypt with a cost factor of 12 (configurable).
- **Token storage** — all tokens stored in `httpOnly` cookies, inaccessible to JavaScript (XSS mitigation).
