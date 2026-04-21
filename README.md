# Movie Night Planner

A full-stack collaborative app for planning movie nights with groups, sessions, voting, recommendations, watchlists, and friend/presence features.

This README is the primary project reference for architecture, implementation layout, and API surface.

## Tech Stack

- Frontend: React + Vite (`frontend/`)
- Backend: Node.js + Express + TypeScript (`backend/`)
- Database: Prisma ORM with schema at `database/schema.prisma`
- Auth: JWT-based access/refresh flow

## Monorepo Layout

```text
movie-night-planner/
├─ frontend/                  # React client
│  ├─ src/
│  └─ package.json
├─ backend/                   # Express API
│  ├─ src/
│  ├─ dist/                   # build output
│  └─ package.json
├─ database/
│  └─ schema.prisma
├─ docs/
│  └─ ARCHITECTURE.md
└─ README.md
```

## Architecture Overview

The backend uses a layered architecture:

1. `routes` define endpoint paths and middleware chains.
2. `controllers` map HTTP requests/responses to business actions.
3. `services` hold business logic.
4. `repositories` handle data access.
5. `dtos` provide request validation schemas.

Cross-cutting concerns include:

- Authentication middleware (`authenticate`, `requireAuth`)
- Role checks (group admin / system admin)
- Group-scoped access control
- Validation middleware (request body/query)
- Centralized async and error handling

The frontend is a React SPA with page-level components and shared utility modules for auth, group data, recommendations, and UI state.

## Current Implementation (Code-Accurate)

### Backend `backend/src`

- `app.ts`: creates Express app, configures CORS, JSON parser, v1 routes, error handler.
- `index.ts`: backend entrypoint.
- `routes/api/v1/`: API route registration and domain routes.
- `controllers/`: auth, user, group, session, vote, movie, recommendation controllers.
- `services/`: domain business logic (auth, users, groups, sessions, votes, movies, recommendations, presence).
- `repositories/`: persistence layer modules (users, groups, sessions, votes, watchlist/watched, invites, friendships).
- `dtos/`: validation schemas for auth/user/group/session/vote/movie payloads.
- `middleware/`: auth, RBAC, validation, group-access, error handling, rate limit/security utilities.
- `utils/`: helpers like JWT and TMDB client.

### Frontend `frontend/src`

- `App.jsx`: high-level app flow/state and top-level navigation switching.
- `HomePage.jsx`, `GroupPage.jsx`, `GroupDetailPage.jsx`: core user pages.
- `AuthPage.jsx`, `authService.js`: login/signup/session utilities.
- `AdminControlsModal.jsx`, `adminDataStore.js`: system admin controls/data access.
- `groupDataStore.js`: group/session/vote related client-side operations.
- `recommendationUtils.js`, `posterUtils.js`, `offlineCatalog.js`: recommendation and movie catalog helpers.
- `main.jsx`: app bootstrap.

## API Overview

Base URL: `http://localhost:3000/api/v1`

### Route Modules

- `/auth` -> `auth-routes.ts`
- `/users` -> `user-routes.ts`
- `/movies` -> `movie-routes.ts`
- `/groups` -> `group-routes.ts` (includes nested sessions and votes)

### Auth Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### User Endpoints (authenticated)

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

### Movie Endpoints

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

### Group + Session + Vote Endpoints (authenticated)

Group root:

- `GET /groups`
- `POST /groups`
- `POST /groups/:groupId/join`

Group-scoped (participant required):

- `GET /groups/:groupId`
- `PATCH /groups/:groupId` (group admin)
- `DELETE /groups/:groupId` (group admin)
- `POST /groups/:groupId/leave`
- `GET /groups/:groupId/members`
- `GET /groups/:groupId/invite-candidates`
- `POST /groups/:groupId/invites` (group admin)
- `POST /groups/:groupId/members/:userId/remove` (group admin)
- `GET /groups/:groupId/recommendations`

Sessions:

- `GET /groups/:groupId/sessions`
- `POST /groups/:groupId/sessions`
- `GET /groups/:groupId/sessions/:sessionId`
- `PATCH /groups/:groupId/sessions/:sessionId`
- `DELETE /groups/:groupId/sessions/:sessionId`

Votes:

- `GET /groups/:groupId/sessions/:sessionId/votes`
- `POST /groups/:groupId/sessions/:sessionId/votes`
- `PATCH /groups/:groupId/sessions/:sessionId/votes/me`

## Environment Configuration

Backend env file: `backend/.env`

Common variables include:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- API keys as needed (for example TMDB/OpenAI integrations, if enabled)

Do not commit real secrets. Keep local secrets in `.env` only.

## Local Development

### 1) Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2) Database setup (backend)

```bash
cd backend
npm run db:generate
npm run db:migrate
```

### 3) Run apps

Backend (default API on port 3000):

```bash
cd backend
npm run dev
```

Frontend (Vite dev server, typically 5173):

```bash
cd frontend
npm run dev
```

## Build Commands

Backend:

- `npm run build`
- `npm run start`

Frontend:

- `npm run build`
- `npm run preview`

## Quality Commands

Backend:

- `npm run lint`
- `npm run format`

Frontend:

- `npm run lint`

## Additional Documentation

- `docs/ARCHITECTURE.md`: broader architecture and planning notes.

If this README and any other docs drift, treat this README + route/controller code as the source of truth for currently implemented behavior.