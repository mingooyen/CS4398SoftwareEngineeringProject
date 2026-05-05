# AI Prompts Used During Development

This document records the key prompts submitted to AI tools (Claude Code) during the development of the **Movie Night Planner** project.

---

## 1. Project Scaffolding

**Prompt:**
> "Set up a full-stack monorepo for a collaborative movie-planning app. The backend should use Node.js + Express + TypeScript with a layered architecture (routes → controllers → services → repositories). The frontend should be React + Vite. Use Prisma ORM with MongoDB for the database. Include JWT-based auth with access and refresh tokens."

**Result:** Initial monorepo structure with `frontend/`, `backend/`, `database/` folders, base Express app, Prisma schema skeleton, and Vite React setup.

---

## 2. Database Schema Design

**Prompt:**
> "Design a Prisma schema for MongoDB that supports: Users with roles (USER, SYSTEM_ADMIN), Groups with members (MEMBER/ADMIN roles), Sessions for movie nights, Votes per session, Watchlists and watched history with ratings, Friend requests with status tracking, and Group invites. Use ObjectId for all IDs."

**Result:** Complete `database/schema.prisma` with all models, enums (`Role`, `UserSystemRole`, `FriendshipStatus`, `GroupInviteStatus`), indexes, and relation definitions.

---

## 3. Authentication System

**Prompt:**
> "Implement JWT auth with access tokens (short-lived) and refresh tokens (stored in DB, rotated on each refresh). Include register, login, refresh, and logout endpoints. Hash passwords with bcrypt. Set tokens as httpOnly cookies. Add middleware that extracts user from the access token and attaches userId to the request."

**Result:** `auth-service.ts`, `auth-controller.ts`, `auth-routes.ts`, `jwt.ts` utility, and `auth.ts` middleware.

---

## 4. RBAC Middleware

**Prompt:**
> "Add role-based access control middleware. I need `requireGroupAdmin` that checks the authenticated user has ADMIN role in the target group (from groupId in params), and `requireSystemAdmin` that checks the user's systemRole on their User record. Also add `loadGroupOnly` and `requireGroupParticipant` for group-scoped routes."

**Result:** `rbac.ts` and `group-access.ts` middleware modules with all four guards.

---

## 5. Movie Integration with TMDB

**Prompt:**
> "Create a TMDB API client utility that supports searching movies by query and fetching movie details by tmdbId. Then build a movie service and controller with endpoints for: searching movies, getting movie details, adding/removing from watchlist, marking movies as watched with an optional rating, and fetching the user's ratings. Also add a global movie catalog that SYSTEM_ADMINs can add to."

**Result:** `tmdb-client.ts`, `movie-service.ts`, `movie-controller.ts`, `movie-routes.ts`, and related repository files.

---

## 6. Group and Session Management

**Prompt:**
> "Implement full CRUD for groups. A user who creates a group is automatically an ADMIN member. Support join (adds user as MEMBER), leave, update (admin only), delete (admin only). Nest sessions under groups — each session has a scheduled date/time and an optional movieTmdbId. Add nested vote routes under sessions: cast a vote (one per user per session), get aggregated results, and update your own vote."

**Result:** `group-service.ts`, `session-service.ts`, `vote-service.ts` and their controllers/routes, `group-member-repository.ts`, `session-repository.ts`, `vote-repository.ts`.

---

## 7. Friend System and Group Invites

**Prompt:**
> "Add a friendship system: users can send friend requests, accept or deny them, and list their friends. Also add group invite functionality: group admins can invite users to groups, invitees can accept or decline. Add an invite-candidates endpoint that returns friends + users from overlapping groups, excluding current members."

**Result:** `friendship-repository.ts`, `group-invite-repository.ts`, friendship and invite endpoints in `user-routes.ts` and `group-routes.ts`.

---

## 8. AI Recommendation Engine

**Prompt:**
> "Build an AI recommendation service that takes a group's watch history and member preferences and calls OpenAI to suggest movies the group would enjoy. Each recommendation should include a satisfaction score (0–1) and a short explanation. Prioritize movies unwatched by all group members. Expose this as GET /groups/:groupId/recommendations."

**Result:** `services/ai/recommendation-engine.ts`, `services/ai/types.ts`, `recommendation-service.ts`, `recommendation-controller.ts`.

---

## 9. Frontend Core Pages

**Prompt:**
> "Build the React frontend with: an AuthPage for login/register, a HomePage showing the user's groups and a friends sidebar with online presence indicators, a GroupPage listing groups with search, and a GroupDetailPage showing sessions, members, a movie voting interface, and a recommendations tab. Use a local groupDataStore for client-side data operations."

**Result:** `App.jsx`, `AuthPage.jsx`, `HomePage.jsx`, `GroupPage.jsx`, `GroupDetailPage.jsx`, `authService.js`, `groupDataStore.js`.

---

## 10. Admin Controls

**Prompt:**
> "Add an AdminControlsModal component that SYSTEM_ADMIN users can open from the homepage. It should display all groups, allow the admin to open any group, add movies to the global catalog, and manage platform-wide settings. Source data from an adminDataStore."

**Result:** `AdminControlsModal.jsx`, `adminDataStore.js`.

---

## 11. Unit Tests

**Prompt:**
> "Write Vitest unit tests for: the JWT utility (sign and verify access/refresh tokens), DTO validation schemas (valid and invalid payloads for auth, group, session, vote, movie schemas), and the Prisma schema structure validation. Use describe/it/expect blocks."

**Result:** `jwt.test.ts`, `schemas.test.ts`, `schema.prisma.test.ts`.

---

## 12. Presence Store

**Prompt:**
> "Add an in-memory presence store that tracks which users are currently online. Expose a POST /users/me/presence endpoint to update presence, and include presence data in the friends list response so the frontend can show online/offline indicators."

**Result:** `presence-store.ts`, presence endpoint in `user-routes.ts`.

---

## 13. Security Hardening

**Prompt:**
> "Add security middleware: helmet for HTTP headers, CORS with an allowlist from env, rate limiting (stricter on auth endpoints), and centralized error handling that maps AppError subclasses to appropriate HTTP status codes without leaking stack traces in production."

**Result:** `security.ts`, `rate-limit.ts`, `error-handler.ts`, `errors.ts`.
