# Movie Night Planner - Architecture (Current Implementation)

This document reflects what is currently implemented in the repository.

## 1) System Overview

- Frontend: React + Vite app in `frontend/`
- Backend: Express + TypeScript API in `backend/`
- Database: Prisma schema in `database/schema.prisma`
- Auth model: token-based auth with route-level protection

Backend uses a layered flow:

`routes -> controllers -> services -> repositories -> database/external APIs`

Validation and access control are applied in middleware.

## 2) Repository Structure

```text
movie-night-planner/
|- frontend/
|  |- src/
|  |- dist/
|  `- package.json
|- backend/
|  |- src/
|  |  |- app.ts
|  |  |- index.ts
|  |  |- config/
|  |  |- controllers/
|  |  |- dtos/
|  |  |- middleware/
|  |  |- repositories/
|  |  |- routes/api/v1/
|  |  |- services/
|  |  `- utils/
|  |- dist/
|  `- package.json
|- database/
|  `- schema.prisma
|- docs/
|  `- ARCHITECTURE.md
`- README.md
```

## 3) Backend Architecture

### 3.1 App Initialization

`backend/src/app.ts`:

- Creates Express app
- Configures CORS allowlist from `CORS_ORIGINS` (or local defaults)
- Enables JSON middleware
- Registers v1 routes
- Applies centralized error handler

### 3.2 Route Registration

`backend/src/routes/api/v1/index.ts` mounts:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/movies`
- `/api/v1/groups`

### 3.3 Middleware Responsibilities

- `auth.ts`: `authenticate`, `requireAuth`
- `rbac.ts`: `requireGroupAdmin`, `requireSystemAdmin`
- `group-access.ts`: `loadGroupOnly`, `requireGroupParticipant`
- `validate.ts`: request body/query validation
- `async-handler.ts`: async controller wrapper helpers
- `error-handler.ts`: consistent API error responses

### 3.4 Layered Responsibilities

- Routes: define endpoint + middleware chains
- Controllers: HTTP input/output mapping
- Services: business rules and orchestration
- Repositories: persistence operations
- DTOs: schema validation definitions

## 4) Frontend Architecture (Current)

Current frontend is component/page-driven in `frontend/src`:

- Root app flow: `App.jsx`
- Main pages: `HomePage.jsx`, `GroupPage.jsx`, `GroupDetailPage.jsx`, `AuthPage.jsx`
- Session/auth helpers: `authService.js`
- Group data access: `groupDataStore.js`
- Admin features: `AdminControlsModal.jsx`, `adminDataStore.js`
- Recommendation/movie helpers: `recommendationUtils.js`, `posterUtils.js`, `offlineCatalog.js`

## 5) API Surface (Implemented)

Base path: `/api/v1`

## 5.1 Auth Routes

From `auth-routes.ts`:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## 5.2 User Routes (Authenticated)

From `user-routes.ts`:

- `GET /users/search`
- `GET /users/friends`
- `GET /users/friend-requests`
- `POST /users/friend-requests`
- `POST /users/friend-requests/:requestId/accept`
- `POST /users/friend-requests/:requestId/deny`
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/preferences`
- `POST /users/me/presence`

## 5.3 Movie Routes

Public:

- `GET /movies/discover`
- `GET /movies/genres`

Authenticated:

- `GET /movies/catalog`
- `POST /movies/catalog` (system admin)
- `GET /movies/search`
- `GET /movies/watchlist`
- `POST /movies/watchlist`
- `DELETE /movies/watchlist/:tmdbId`
- `POST /movies/watched`
- `GET /movies/ratings`
- `GET /movies/:tmdbId`

## 5.4 Group Routes

From `group-routes.ts`:

Top-level:

- `GET /groups`
- `POST /groups`
- `POST /groups/:groupId/join`

Group-scoped (participant/system admin required):

- `GET /groups/:groupId`
- `PATCH /groups/:groupId` (group admin)
- `DELETE /groups/:groupId` (group admin)
- `POST /groups/:groupId/leave`
- `GET /groups/:groupId/members`
- `GET /groups/:groupId/invite-candidates`
- `POST /groups/:groupId/invites` (group admin)
- `POST /groups/:groupId/members/:userId/remove` (group admin)
- `GET /groups/:groupId/recommendations`

Nested session routes:

- `GET /groups/:groupId/sessions`
- `POST /groups/:groupId/sessions`
- `GET /groups/:groupId/sessions/:sessionId`
- `PATCH /groups/:groupId/sessions/:sessionId`
- `DELETE /groups/:groupId/sessions/:sessionId`

Nested vote routes:

- `GET /groups/:groupId/sessions/:sessionId/votes`
- `POST /groups/:groupId/sessions/:sessionId/votes`
- `PATCH /groups/:groupId/sessions/:sessionId/votes/me`

## 6) Data and Integrations

- Prisma ORM is used for database access (`@prisma/client`).
- Schema source of truth: `database/schema.prisma`.
- Movie/recommendation functionality integrates with internal service modules and external providers configured through environment variables.

## 7) Development Workflow

Backend:

- Dev server: `npm run dev`
- Build: `npm run build`
- Start build: `npm run start`
- Prisma tools: `npm run db:generate`, `npm run db:migrate`, `npm run db:push`, `npm run db:studio`

Frontend:

- Dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

## 8) Notes

- This file documents implemented architecture, not a future-state skeleton.
- If code and docs differ, backend route files under `backend/src/routes/api/v1/` are the API source of truth.
# Collaborative Movie Night Planner — Architecture & Skeleton

---

## 1) Architecture Summary

- **Layered backend**: API routes → controllers → services → repositories → Prisma/DB; DTOs (Zod) at boundary; typed errors and error-handling middleware.
- **Auth**: JWT access + refresh tokens in httpOnly cookies; refresh rotation; optional rate limiting and security middleware (helmet, cors).
- **Frontend**: React 18 + Vite + TypeScript + React Router; feature-based folders; API client service layer; shared types where applicable.
- **Data**: PostgreSQL via Prisma ORM; repository pattern wraps all Prisma access; migrations versioned; indexes on FKs and query hot paths.
- **External**: TMDB API for movie metadata (search, details); OpenAI API for group recommendations (unwatched-first, satisfaction score, short explanation).
- **RBAC**: Group roles (member/admin); middleware checks admin for destructive/privileged group actions (e.g. remove member, delete group).
- **Voting**: Sessions have attached movie; votes per session; results aggregated and exposed via API; selection flows into scheduled session.
- **Recommendations**: Service consumes group members’ watch history + ratings; calls AI module; returns ranked list + explanations; used by session creation and “suggest movie” flows.

---

## 2) Repo Tree

```
movie-night-planner/
├── frontend/                        # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── movie/
│   │   │   ├── group/
│   │   │   ├── session/
│   │   │   ├── voting/
│   │   │   └── auth/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                         # Express + TypeScript backend
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   │   └── api/
│   │   │       └── v1/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   └── ai/
│   │   ├── repositories/
│   │   ├── dtos/
│   │   ├── types/
│   │   ├── utils/
│   │   └── app.ts
├── database/                        # Prisma schema + migrations
│   ├── schema.prisma
│   └── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   └── API-CONTRACT.md
├── .gitignore
├── .env.example                    # Root env template (frontend + backend vars)
└── README.md
```

---

## 3) Backend Skeleton

### config

- `config/env.ts` — `getEnv(): Env` (validates NODE_ENV, DATABASE_URL, JWT_SECRET, etc.)
- `config/database.ts` — `getPrisma(): PrismaClient` (singleton)

### middleware

- `middleware/auth.ts` — `requireAuth(req, res, next)`, `optionalAuth(req, res, next)`
- `middleware/rbac.ts` — `requireGroupAdmin(req, res, next)` (expects groupId in params/body)
- `middleware/validate.ts` — `validateBody(schema: ZodSchema)(req, res, next)`, `validateQuery(schema)(req, res, next)`
- `middleware/error-handler.ts` — `errorHandler(err, req, res, next)`
- `middleware/rate-limit.ts` — `apiRateLimiter`, `authRateLimiter`
- `middleware/security.ts` — re-export helmet, cors config

### routes (api/v1)

- `routes/api/v1/index.ts` — `registerV1Routes(app): void` (mounts all v1 routers)
- `routes/api/v1/auth-routes.ts` — POST /api/v1/auth/register, /api/v1/auth/login, POST /api/v1/auth/refresh, POST /api/v1/auth/logout
- `routes/api/v1/user-routes.ts` — GET/PATCH /api/v1/users/me, GET /api/v1/users/me/preferences
- `routes/api/v1/movie-routes.ts` — GET /api/v1/movies/search, GET /api/v1/movies/:tmdbId, POST/DELETE /api/v1/movies/watchlist, GET /api/v1/movies/watchlist, POST /api/v1/movies/watched, GET /api/v1/movies/ratings
- `routes/api/v1/group-routes.ts` — GET/POST /api/v1/groups, GET/PATCH/DELETE /api/v1/groups/:groupId, POST /api/v1/groups/:groupId/join, POST /api/v1/groups/:groupId/leave, GET /api/v1/groups/:groupId/members
- `routes/api/v1/session-routes.ts` — GET/POST /api/v1/groups/:groupId/sessions, GET/PATCH/DELETE /api/v1/groups/:groupId/sessions/:sessionId
- `routes/api/v1/vote-routes.ts` — POST /api/v1/groups/:groupId/sessions/:sessionId/votes, GET /api/v1/groups/:groupId/sessions/:sessionId/votes, PATCH /api/v1/groups/:groupId/sessions/:sessionId/votes/me

### controllers

- `controllers/auth-controller.ts` — `register(req, res)`, `login(req, res)`, `refresh(req, res)`, `logout(req, res)`
- `controllers/user-controller.ts` — `getMe(req, res)`, `updateMe(req, res)`, `getMyPreferences(req, res)`
- `controllers/movie-controller.ts` — `searchMovies(req, res)`, `getMovieByTmdbId(req, res)`, `addToWatchlist(req, res)`, `removeFromWatchlist(req, res)`, `getWatchlist(req, res)`, `markWatched(req, res)`, `getMyRatings(req, res)`
- `controllers/group-controller.ts` — `listGroups(req, res)`, `createGroup(req, res)`, `getGroup(req, res)`, `updateGroup(req, res)`, `deleteGroup(req, res)`, `joinGroup(req, res)`, `leaveGroup(req, res)`, `getGroupMembers(req, res)`
- `controllers/session-controller.ts` — `listSessions(req, res)`, `createSession(req, res)`, `getSession(req, res)`, `updateSession(req, res)`, `deleteSession(req, res)`
- `controllers/vote-controller.ts` — `createOrUpdateVote(req, res)`, `getVoteResults(req, res)`, `getMyVote(req, res)`

### services

- `services/auth-service.ts` — `register(dto): Promise<AuthResult>`, `login(dto): Promise<AuthResult>`, `refresh(refreshToken): Promise<TokenPair>`, `revokeRefreshToken(tokenId): Promise<void>`
- `services/user-service.ts` — `getById(id): Promise<User | null>`, `updateProfile(userId, dto): Promise<User>`, `getPreferences(userId): Promise<UserPreferences>`
- `services/movie-service.ts` — `searchTmdb(query): Promise<TmdbSearchResult[]>`, `getTmdbDetails(tmdbId): Promise<TmdbMovieDetails>`, `addToWatchlist(userId, tmdbId): Promise<void>`, `removeFromWatchlist(userId, tmdbId): Promise<void>`, `getWatchlist(userId): Promise<WatchlistEntry[]>`, `markWatched(userId, dto): Promise<void>`, `getRatings(userId): Promise<Rating[]>`
- `services/group-service.ts` — `create(userId, dto): Promise<Group>`, `findForUser(userId): Promise<Group[]>`, `getById(groupId): Promise<Group | null>`, `update(groupId, dto, actorId): Promise<Group>`, `delete(groupId, actorId): Promise<void>`, `join(groupId, userId): Promise<void>`, `leave(groupId, userId): Promise<void>`, `getMembers(groupId): Promise<GroupMember[]>`, `getMemberRole(groupId, userId): Promise<Role | null>`
- `services/session-service.ts` — `create(groupId, dto, userId): Promise<Session>`, `listByGroup(groupId): Promise<Session[]>`, `getById(groupId, sessionId): Promise<Session | null>`, `update(groupId, sessionId, dto, userId): Promise<Session>`, `delete(groupId, sessionId, userId): Promise<void>`
- `services/vote-service.ts` — `castVote(groupId, sessionId, userId, movieTmdbId): Promise<Vote>`, `getResults(groupId, sessionId): Promise<VoteResult[]>`, `getMyVote(groupId, sessionId, userId): Promise<Vote | null>`
- `services/recommendation-service.ts` — `getGroupRecommendations(groupId, options?): Promise<RecommendationItem[]>` (calls AI module, uses watchlist/watched/ratings)

### services/ai

- `services/ai/recommendation-engine.ts` — `generateRecommendations(input: RecommendationInput): Promise<RecommendationOutput>` (OpenAI; prioritizes unwatched-by-all, satisfaction score, explanation)
- `services/ai/types.ts` — `RecommendationInput`, `RecommendationOutput`, `RecommendationItem` (movie ref, score, explanation)

### repositories

- `repositories/user-repository.ts` — `findById(id): Promise<User | null>`, `findByEmail(email): Promise<User | null>`, `create(data): Promise<User>`, `update(id, data): Promise<User>`
- `repositories/refresh-token-repository.ts` — `create(userId, token, expiresAt): Promise<RefreshToken>`, `findByToken(token): Promise<RefreshToken | null>`, `revoke(id): Promise<void>`, `revokeAllForUser(userId): Promise<void>`
- `repositories/watchlist-repository.ts` — `add(userId, tmdbId): Promise<void>`, `remove(userId, tmdbId): Promise<void>`, `listByUser(userId): Promise<WatchlistEntry[]>`, `exists(userId, tmdbId): Promise<boolean>`
- `repositories/watched-repository.ts` — `upsert(userId, tmdbId, rating?): Promise<void>`, `listByUser(userId): Promise<WatchedEntry[]>`, `getRating(userId, tmdbId): Promise<number | null>`
- `repositories/group-repository.ts` — `create(data): Promise<Group>`, `findManyByMember(userId): Promise<Group[]>`, `findById(id): Promise<Group | null>`, `update(id, data): Promise<Group>`, `delete(id): Promise<void>`
- `repositories/group-member-repository.ts` — `add(groupId, userId, role): Promise<GroupMember>`, `remove(groupId, userId): Promise<void>`, `findByGroup(groupId): Promise<GroupMember[]>`, `getRole(groupId, userId): Promise<Role | null>`
- `repositories/session-repository.ts` — `create(data): Promise<Session>`, `findByGroup(groupId): Promise<Session[]>`, `findById(groupId, sessionId): Promise<Session | null>`, `update(sessionId, data): Promise<Session>`, `delete(sessionId): Promise<void>`
- `repositories/vote-repository.ts` — `upsert(sessionId, userId, movieTmdbId): Promise<Vote>`, `findBySession(sessionId): Promise<Vote[]>`, `findBySessionAndUser(sessionId, userId): Promise<Vote | null>`

### dtos

- `dtos/auth-dtos.ts` — `registerBodySchema`, `loginBodySchema` (Zod); inferred types `RegisterBody`, `LoginBody`
- `dtos/user-dtos.ts` — `updateProfileBodySchema`, `preferencesQuerySchema`
- `dtos/movie-dtos.ts` — `searchQuerySchema`, `watchlistBodySchema`, `markWatchedBodySchema`
- `dtos/group-dtos.ts` — `createGroupBodySchema`, `updateGroupBodySchema`
- `dtos/session-dtos.ts` — `createSessionBodySchema`, `updateSessionBodySchema` (date, time, movieTmdbId optional)
- `dtos/vote-dtos.ts` — `castVoteBodySchema` (movieTmdbId)

### types

- `types/errors.ts` — `AppError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError` (extend Error; optional code)
- `types/express.d.ts` — extend `Request` with `userId?: string`, `refreshTokenId?: string`

### utils

- `utils/jwt.ts` — `signAccess(payload): string`, `signRefresh(payload): string`, `verifyAccess(token): JwtPayload`, `verifyRefresh(token): JwtPayload`
- `utils/tmdb-client.ts` — `searchMovies(query): Promise<TmdbSearchResult[]>`, `getMovieDetails(tmdbId): Promise<TmdbMovieDetails>` (TMDB API)

### app entry

- `app.ts` — `createApp(): Express` (middleware order: security, rate limit, json, routes, error handler)
- `server.ts` or `index.ts` — start HTTP server; `getEnv()`, `getPrisma()`, run migrations or defer to CLI

---

## 4) Frontend Skeleton

### components/common

- `components/common/button.tsx` — `Button(props): JSX.Element`
- `components/common/input.tsx` — `Input(props): JSX.Element`
- `components/common/card.tsx` — `Card(props): JSX.Element`
- `components/common/modal.tsx` — `Modal(props): JSX.Element`
- `components/common/spinner.tsx` — `Spinner(): JSX.Element`

### components/layout

- `components/layout/app-layout.tsx` — `AppLayout({ children }): JSX.Element` (nav + outlet)
- `components/layout/header.tsx` — `Header(): JSX.Element`
- `components/layout/footer.tsx` — `Footer(): JSX.Element`

### components/movie

- `components/movie/movie-card.tsx` — `MovieCard({ movie, actions? }): JSX.Element`
- `components/movie/movie-detail.tsx` — `MovieDetail({ tmdbId }): JSX.Element`
- `components/movie/movie-search.tsx` — `MovieSearch({ onSelect? }): JSX.Element`
- `components/movie/watchlist-button.tsx` — `WatchlistButton({ tmdbId, onToggle }): JSX.Element`
- `components/movie/rate-movie.tsx` — `RateMovie({ tmdbId, initialRating?, onSubmit }): JSX.Element`

### components/group

- `components/group/group-card.tsx` — `GroupCard({ group }): JSX.Element`
- `components/group/group-form.tsx` — `GroupForm({ initialValues?, onSubmit }): JSX.Element`
- `components/group/group-members.tsx` — `GroupMembers({ groupId }): JSX.Element`
- `components/group/join-group.tsx` — `JoinGroup({ groupId, onJoined }): JSX.Element`

### components/session

- `components/session/session-card.tsx` — `SessionCard({ session }): JSX.Element`
- `components/session/session-form.tsx` — `SessionForm({ groupId, initialValues?, onSubmit }): JSX.Element`
- `components/session/session-detail.tsx` — `SessionDetail({ groupId, sessionId }): JSX.Element`

### components/voting

- `components/voting/vote-form.tsx` — `VoteForm({ sessionId, groupId, options, onSubmit }): JSX.Element`
- `components/voting/vote-results.tsx` — `VoteResults({ sessionId, groupId }): JSX.Element`

### components/auth

- `components/auth/login-form.tsx` — `LoginForm({ onSuccess }): JSX.Element`
- `components/auth/register-form.tsx` — `RegisterForm({ onSuccess }): JSX.Element`
- `components/auth/protected-route.tsx` — `ProtectedRoute({ children }): JSX.Element`

### pages

- `pages/home-page.tsx` — `HomePage(): JSX.Element`
- `pages/login-page.tsx` — `LoginPage(): JSX.Element`
- `pages/register-page.tsx` — `RegisterPage(): JSX.Element`
- `pages/profile-page.tsx` — `ProfilePage(): JSX.Element`
- `pages/movies-page.tsx` — `MoviesPage(): JSX.Element` (search + browse)
- `pages/movie-detail-page.tsx` — `MovieDetailPage(): JSX.Element`
- `pages/watchlist-page.tsx` — `WatchlistPage(): JSX.Element`
- `pages/groups-page.tsx` — `GroupsPage(): JSX.Element`
- `pages/group-detail-page.tsx` — `GroupDetailPage(): JSX.Element`
- `pages/session-detail-page.tsx` — `SessionDetailPage(): JSX.Element`
- `pages/recommendations-page.tsx` — `RecommendationsPage(): JSX.Element` (group-scoped)

### hooks

- `hooks/use-auth.ts` — `useAuth(): AuthContextValue` (user, login, logout, isAuthenticated)
- `hooks/use-api.ts` — `useApi(): ApiClient` (or get from context)
- `hooks/use-movies.ts` — `useMovieSearch(query): UseQueryResult`, `useMovieDetails(tmdbId): UseQueryResult`, `useWatchlist(): UseQueryResult`
- `hooks/use-groups.ts` — `useGroups(): UseQueryResult`, `useGroup(groupId): UseQueryResult`, `useGroupMembers(groupId): UseQueryResult`
- `hooks/use-sessions.ts` — `useSessions(groupId): UseQueryResult`, `useSession(groupId, sessionId): UseQueryResult`
- `hooks/use-votes.ts` — `useVoteResults(groupId, sessionId): UseQueryResult`, `useMyVote(groupId, sessionId): UseQueryResult`
- `hooks/use-recommendations.ts` — `useGroupRecommendations(groupId): UseQueryResult`

### services

- `services/api-client.ts` — `createApiClient(baseUrl): ApiClient`; methods: `get`, `post`, `patch`, `delete`; attach cookies; handle 401/refresh
- `services/auth-service.ts` — `login(credentials): Promise<void>`, `register(data): Promise<void>`, `logout(): Promise<void>`, `refresh(): Promise<boolean>`
- `services/movie-service.ts` — `searchMovies(query): Promise<MovieSearchResult[]>`, `getMovieDetails(tmdbId): Promise<MovieDetails>`, `getWatchlist(): Promise<WatchlistItem[]>`, `addToWatchlist(tmdbId): Promise<void>`, `removeFromWatchlist(tmdbId): Promise<void>`, `markWatched(tmdbId, rating?): Promise<void>`
- `services/group-service.ts` — `getGroups(): Promise<Group[]>`, `getGroup(id): Promise<Group>`, `createGroup(data): Promise<Group>`, `updateGroup(id, data): Promise<Group>`, `joinGroup(id): Promise<void>`, `leaveGroup(id): Promise<void>`, `getMembers(groupId): Promise<Member[]>`
- `services/session-service.ts` — `getSessions(groupId): Promise<Session[]>`, `getSession(groupId, sessionId): Promise<Session>`, `createSession(groupId, data): Promise<Session>`, `updateSession(groupId, sessionId, data): Promise<Session>`, `deleteSession(groupId, sessionId): Promise<void>`
- `services/vote-service.ts` — `castVote(groupId, sessionId, movieTmdbId): Promise<void>`, `getResults(groupId, sessionId): Promise<VoteResult[]>`, `getMyVote(groupId, sessionId): Promise<Vote | null>`
- `services/recommendation-service.ts` — `getGroupRecommendations(groupId): Promise<RecommendationItem[]>`

### store

- `store/auth-context.tsx` — `AuthProvider({ children }): JSX.Element`, `useAuth(): AuthContextValue`

### types

- `types/user.ts` — `User`, `UserPreferences`
- `types/movie.ts` — `MovieSearchResult`, `MovieDetails`, `WatchlistItem`, `Rating`
- `types/group.ts` — `Group`, `GroupMember`, `Role`
- `types/session.ts` — `Session`
- `types/vote.ts` — `Vote`, `VoteResult`
- `types/recommendation.ts` — `RecommendationItem`
- `types/api.ts` — `ApiError`, pagination types

### utils

- `utils/constants.ts` — `API_BASE_URL`, routes enum/constants
- `utils/format-date.ts` — `formatSessionDate(date): string`, `formatSessionTime(time): string`

### App and main

- `App.tsx` — Router setup; `AuthProvider`; routes for Home, Login, Register, Profile, Movies, MovieDetail, Watchlist, Groups, GroupDetail, SessionDetail, Recommendations
- `main.tsx` — `createRoot`; `StrictMode`; `BrowserRouter` if not in App

---

## 5) Database Schema (PostgreSQL via Prisma)

- **users** — id (PK UUID), email (unique), passwordHash, displayName, createdAt, updatedAt
- **refresh_tokens** — id (PK UUID), userId (FK → users), token (unique), expiresAt, revokedAt (nullable); index on (token), (userId)
- **user_preferences** — id (PK UUID), userId (FK → users, unique), favoriteGenres (JSON/array), createdAt, updatedAt
- **watchlist** — id (PK UUID), userId (FK → users), tmdbId (int), addedAt; unique (userId, tmdbId); index on userId
- **watched** — id (PK UUID), userId (FK → users), tmdbId (int), rating (decimal nullable), watchedAt; unique (userId, tmdbId); index on userId
- **groups** — id (PK UUID), name, slug (unique), description (nullable), createdById (FK → users), createdAt, updatedAt; index on slug
- **group_members** — id (PK UUID), groupId (FK → groups), userId (FK → users), role (enum: MEMBER, ADMIN), joinedAt; unique (groupId, userId); indexes on groupId, userId
- **sessions** — id (PK UUID), groupId (FK → groups), scheduledAt (timestamp), movieTmdbId (int nullable), createdById (FK → users), createdAt, updatedAt; index on groupId
- **votes** — id (PK UUID), sessionId (FK → sessions), userId (FK → users), movieTmdbId (int), createdAt, updatedAt; unique (sessionId, userId); indexes on sessionId, userId

Enums: `Role` (MEMBER, ADMIN).

Junction tables: **group_members** (groups ↔ users); **watchlist** / **watched** (users ↔ movies by tmdbId). Movies are not stored as rows; tmdbId references TMDB.

---

## 6) API Contract

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | /api/v1/auth/register | no | { email, password, displayName } | { user: User, accessToken (cookie), refreshToken (cookie) } |
| POST | /api/v1/auth/login | no | { email, password } | { user: User, accessToken (cookie), refreshToken (cookie) } |
| POST | /api/v1/auth/refresh | refresh cookie | — | 204 or new cookies |
| POST | /api/v1/auth/logout | yes | — | 204 |
| GET | /api/v1/users/me | yes | — | User |
| PATCH | /api/v1/users/me | yes | { displayName?, preferences? } | User |
| GET | /api/v1/users/me/preferences | yes | — | UserPreferences |
| GET | /api/v1/movies/search | yes | query: q | { results: TmdbSearchResult[] } |
| GET | /api/v1/movies/:tmdbId | yes | — | TmdbMovieDetails + optional watchlist/watched/rating |
| POST | /api/v1/movies/watchlist | yes | { tmdbId } | 201 |
| DELETE | /api/v1/movies/watchlist/:tmdbId | yes | — | 204 |
| GET | /api/v1/movies/watchlist | yes | — | WatchlistEntry[] |
| POST | /api/v1/movies/watched | yes | { tmdbId, rating? } | 201 |
| GET | /api/v1/movies/ratings | yes | — | { ratings: { tmdbId, rating }[] } |
| GET | /api/v1/groups | yes | — | Group[] |
| POST | /api/v1/groups | yes | { name, description?, slug? } | Group |
| GET | /api/v1/groups/:groupId | yes | — | Group |
| PATCH | /api/v1/groups/:groupId | yes (admin) | { name?, description? } | Group |
| DELETE | /api/v1/groups/:groupId | yes (admin) | — | 204 |
| POST | /api/v1/groups/:groupId/join | yes | — | 201 |
| POST | /api/v1/groups/:groupId/leave | yes | — | 204 |
| GET | /api/v1/groups/:groupId/members | yes | — | GroupMember[] |
| GET | /api/v1/groups/:groupId/sessions | yes | — | Session[] |
| POST | /api/v1/groups/:groupId/sessions | yes | { scheduledAt, movieTmdbId? } | Session |
| GET | /api/v1/groups/:groupId/sessions/:sessionId | yes | — | Session |
| PATCH | /api/v1/groups/:groupId/sessions/:sessionId | yes | { scheduledAt?, movieTmdbId? } | Session |
| DELETE | /api/v1/groups/:groupId/sessions/:sessionId | yes | — | 204 |
| POST | /api/v1/groups/:groupId/sessions/:sessionId/votes | yes | { movieTmdbId } | Vote |
| GET | /api/v1/groups/:groupId/sessions/:sessionId/votes | yes | — | { results: VoteResult[], myVote?: Vote } |
| PATCH | /api/v1/groups/:groupId/sessions/:sessionId/votes/me | yes | { movieTmdbId } | Vote |
| GET | /api/v1/groups/:groupId/recommendations | yes | — | RecommendationItem[] |

All 4xx/5xx: `{ error: string, code?: string }`. Auth: access token in httpOnly cookie or Authorization header; refresh via httpOnly cookie.

---

## 7) AI Recommendation Module

- **Interface**: `RecommendationEngine.generateRecommendations(input: RecommendationInput): Promise<RecommendationOutput>`.
- **Input**: `RecommendationInput` — groupId (or list of userIds), limit (optional), optional sessionId for context (e.g. exclude already-voted).
- **Output**: `RecommendationOutput` — `items: RecommendationItem[]` where each item: `{ tmdbId, title, score (0–1 predicted satisfaction), explanation: string }`.
- **Logic**: Service layer (recommendation-service) loads group members, fetches watchlist + watched + ratings from repositories; builds a payload (e.g. “members A,B,C; A watched []; B watched []; collective ratings …”); calls recommendation-engine; engine calls OpenAI with prompt: prioritize movies unwatched by all, output score and short explanation; return sorted list.
- **Plug-in**: recommendation-service uses group-repository + watchlist/watched repositories; calls `services/ai/recommendation-engine.ts`; used by GET /api/v1/groups/:groupId/recommendations and optionally when creating/editing a session (suggest movie).

---

## 8) Testing Plan

| Layer | Scope | Location | Notes |
|-------|--------|----------|--------|
| Unit | DTOs (Zod) | backend/src/dtos/*.test.ts | Valid/invalid payloads |
| Unit | JWT utils | backend/src/utils/jwt.test.ts | sign/verify access & refresh |
| Unit | Recommendation engine | backend/src/services/ai/recommendation-engine.test.ts | Mock OpenAI; assert input/output shape |
| Unit | Repositories | backend/src/repositories/*.test.ts | Mock Prisma; assert calls and return values |
| Unit | Services | backend/src/services/*.test.ts | Mock repos + TMDB; business logic |
| Integration | API auth | backend/tests/integration/auth.test.ts | Register, login, refresh, protected route |
| Integration | API movies | backend/tests/integration/movies.test.ts | Search, watchlist, watched, ratings |
| Integration | API groups | backend/tests/integration/groups.test.ts | CRUD, join/leave, RBAC |
| Integration | API sessions & votes | backend/tests/integration/sessions-votes.test.ts | Sessions CRUD, cast vote, results |
| E2E | Critical paths | frontend/e2e/*.spec.ts | Login → create group → create session → vote (Playwright/Cypress) |

---

## 9) Dev Workflow

- **Branches**: main (production); feature/xxx, fix/xxx; short-lived PRs into main.
- **Migrations**: Prisma migrations in `database/migrations`; never edit applied migrations; new changes via `npm run db:migrate` (from `backend`).
- **Linting**: ESLint (TypeScript) in frontend and backend; run `npm run lint` in each.
- **Formatting**: Prettier; config in root or per package; `npm run format`; format on save optional.
- **Commits**: Conventional commits preferred: feat:, fix:, chore:, docs:, refactor:; scope optional (e.g. feat(auth): add refresh endpoint).
- **Env**: .env from .env.example; never commit .env; DOCUMENT all vars in .env.example (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, TMDB_API_KEY, OPENAI_API_KEY, etc.).
- **CI**: On PR — install, lint, test (unit + integration); optional E2E on merge to main or nightly.

---

## 10) Future Files (Later Phases)

- **Notifications**: backend — `services/notification-service.ts`, `repositories/notification-repository.ts`, `routes/api/v1/notification-routes.ts`; frontend — `components/notifications/notification-bell.tsx`, `hooks/use-notifications.ts`; DB — `notifications` table (userId, type, payload, readAt).
- **Streaming providers**: backend — `utils/streaming-provider-client.ts` (e.g. JustWatch or provider APIs), `services/movie-service.ts` extend to attach “where to watch”; frontend — `components/movie/where-to-watch.tsx`.
- **Analytics**: backend — `services/analytics-service.ts`, `repositories/analytics-repository.ts`; DB — `session_views` or `event_log` (userId, eventType, resourceId, createdAt); optional dashboard route and admin-only UI.

All of the above remain stubs or out-of-scope until a later phase; no implementation in initial skeleton.
