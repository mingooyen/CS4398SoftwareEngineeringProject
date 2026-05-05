# API Documentation — Movie Night Planner

**Base URL:** `http://localhost:3000/api/v1`

**Authentication:** JWT access token stored in an httpOnly cookie (`access_token`). Include credentials in all requests (`credentials: 'include'`). Use `POST /auth/refresh` when the access token expires.

**Error format:** All 4xx/5xx responses return:
```json
{ "error": "Human-readable message", "code": "OPTIONAL_ERROR_CODE" }
```

---

## Auth

### POST /auth/register

Register a new user account.

**Auth required:** No

**Request body:**
```json
{
  "email": "alice@example.com",
  "password": "Password123!",
  "displayName": "Alice"
}
```

**Responses:**

| Status | Description |
|--------|-------------|
| 201 | User created. Sets `access_token` and `refresh_token` httpOnly cookies. Returns `{ user: User }`. |
| 409 | Email already registered. |
| 422 | Validation error (missing or invalid fields). |

---

### POST /auth/login

Log in with email and password.

**Auth required:** No

**Request body:**
```json
{ "email": "alice@example.com", "password": "Password123!" }
```

**Responses:**

| Status | Description |
|--------|-------------|
| 200 | Login successful. Sets tokens. Returns `{ user: User }`. |
| 401 | Invalid credentials. |

---

### POST /auth/refresh

Rotate the refresh token and issue a new access token.

**Auth required:** Valid `refresh_token` cookie

**Request body:** None

**Responses:**

| Status | Description |
|--------|-------------|
| 204 | New tokens set in cookies. |
| 401 | Refresh token missing, expired, or revoked. |

---

### POST /auth/logout

Log out the current user. Revokes the refresh token.

**Auth required:** Yes

**Request body:** None

**Responses:**

| Status | Description |
|--------|-------------|
| 204 | Logged out. Tokens cleared from cookies. |

---

## Users

### GET /users/me

Get the authenticated user's profile.

**Auth required:** Yes

**Response 200:**
```json
{
  "id": "...",
  "numericId": 1,
  "email": "alice@example.com",
  "displayName": "Alice",
  "systemRole": "USER",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH /users/me

Update the authenticated user's profile.

**Auth required:** Yes

**Request body (all fields optional):**
```json
{ "displayName": "Alicia" }
```

**Response 200:** Updated `User` object.

---

### GET /users/me/preferences

Get the authenticated user's genre preferences.

**Auth required:** Yes

**Response 200:**
```json
{
  "favoriteGenres": ["Action", "Sci-Fi"],
  "forYouExcludedGenres": ["Horror"]
}
```

---

### POST /users/me/presence

Update the authenticated user's online presence timestamp.

**Auth required:** Yes

**Request body:** None

**Response 200:** `{ "ok": true }`

---

### GET /users/search

Search users by display name or numeric ID.

**Auth required:** Yes

**Query params:** `q` (string, required)

**Response 200:** `{ "users": User[] }`

---

### GET /users/friends

List the authenticated user's accepted friends.

**Auth required:** Yes

**Response 200:** `{ "friends": User[] }`

---

### GET /users/friend-requests

List incoming pending friend requests.

**Auth required:** Yes

**Response 200:** `{ "requests": FriendRequest[] }`

---

### POST /users/friend-requests

Send a friend request to another user.

**Auth required:** Yes

**Request body:**
```json
{ "addresseeId": "<userId>" }
```

**Responses:**

| Status | Description |
|--------|-------------|
| 201 | Request sent. |
| 409 | Request already exists or users are already friends. |

---

### POST /users/friend-requests/:requestId/accept

Accept an incoming friend request.

**Auth required:** Yes (must be the addressee)

**Response 204:** Request accepted; friendship created.

---

### POST /users/friend-requests/:requestId/deny

Deny an incoming friend request.

**Auth required:** Yes (must be the addressee)

**Response 204:** Request denied.

---

## Movies

### GET /movies/search

Search movies via TMDB.

**Auth required:** Yes

**Query params:** `q` (string, required)

**Response 200:**
```json
{
  "results": [
    {
      "tmdbId": 27205,
      "title": "Inception",
      "releaseYear": 2010,
      "posterPath": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
      "overview": "..."
    }
  ]
}
```

---

### GET /movies/:tmdbId

Get details for a movie by TMDB ID.

**Auth required:** Yes

**Response 200:** `TmdbMovieDetails` object including title, overview, genres, release date, poster path, and (if the user has an entry) `watchlisted: boolean`, `watched: boolean`, `rating: number | null`.

---

### GET /movies/catalog

List all movies in the platform catalog.

**Auth required:** Yes

**Response 200:** `{ "movies": MovieCatalogEntry[] }`

---

### POST /movies/catalog

Add a movie to the platform catalog.

**Auth required:** Yes (SYSTEM_ADMIN only)

**Request body:**
```json
{
  "title": "Dune",
  "tmdbId": 438631,
  "genre": "Sci-Fi",
  "releaseYear": 2021,
  "posterPath": "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg"
}
```

**Response 201:** Created `MovieCatalogEntry`.

---

### GET /movies/discover

Browse movies from the catalog. Public endpoint.

**Auth required:** No

**Query params:** `genre` (optional)

**Response 200:** `{ "movies": MovieCatalogEntry[] }`

---

### GET /movies/genres

List all genres available in the catalog.

**Auth required:** No

**Response 200:** `{ "genres": string[] }`

---

### GET /movies/watchlist

Get the authenticated user's watchlist.

**Auth required:** Yes

**Response 200:** `{ "watchlist": WatchlistEntry[] }`

---

### POST /movies/watchlist

Add a movie to the user's watchlist.

**Auth required:** Yes

**Request body:**
```json
{ "tmdbId": 27205 }
```

**Responses:**

| Status | Description |
|--------|-------------|
| 201 | Added to watchlist. |
| 409 | Already in watchlist. |

---

### DELETE /movies/watchlist/:tmdbId

Remove a movie from the user's watchlist.

**Auth required:** Yes

**Response 204:** Removed from watchlist.

---

### POST /movies/watched

Mark a movie as watched (with optional rating).

**Auth required:** Yes

**Request body:**
```json
{ "tmdbId": 27205, "rating": 4.5 }
```

**Response 201:** Watched entry created (or updated if already marked).

---

### GET /movies/ratings

Get all the user's movie ratings.

**Auth required:** Yes

**Response 200:** `{ "ratings": [{ "tmdbId": 27205, "rating": 4.5 }] }`

---

## Groups

### GET /groups

List all groups the authenticated user belongs to.

**Auth required:** Yes

**Response 200:** `{ "groups": Group[] }`

---

### POST /groups

Create a new group. The creator is automatically added as ADMIN.

**Auth required:** Yes

**Request body:**
```json
{
  "name": "Weekend Watchers",
  "slug": "weekend-watchers",
  "description": "Our Friday movie group"
}
```

**Response 201:** Created `Group` object.

---

### POST /groups/:groupId/join

Join a group as a MEMBER.

**Auth required:** Yes

**Response 201:** Joined successfully.

---

### GET /groups/:groupId

Get group details.

**Auth required:** Yes (group participant or SYSTEM_ADMIN)

**Response 200:** `Group` object with member count.

---

### PATCH /groups/:groupId

Update group name or description.

**Auth required:** Yes (group ADMIN)

**Request body (all optional):**
```json
{ "name": "New Name", "description": "Updated desc" }
```

**Response 200:** Updated `Group`.

---

### DELETE /groups/:groupId

Delete a group and all its sessions, votes, and invites.

**Auth required:** Yes (group ADMIN)

**Response 204:** Group deleted.

---

### POST /groups/:groupId/leave

Leave a group.

**Auth required:** Yes (group participant)

**Response 204:** Left successfully.

---

### GET /groups/:groupId/members

List all members of a group.

**Auth required:** Yes (group participant)

**Response 200:** `{ "members": GroupMember[] }`

---

### GET /groups/:groupId/invite-candidates

Get users who can be invited (friends + users from overlapping groups, excluding current members).

**Auth required:** Yes (group ADMIN)

**Query params:** `q` (optional search string)

**Response 200:** `{ "candidates": [{ "userId", "displayName", "source": "friend"|"other-group" }] }`

---

### POST /groups/:groupId/invites

Send a group invite to a user.

**Auth required:** Yes (group ADMIN)

**Request body:**
```json
{ "inviteeId": "<userId>" }
```

**Response 201:** Invite sent.

---

### POST /groups/:groupId/members/:userId/remove

Remove a member from the group.

**Auth required:** Yes (group ADMIN or SYSTEM_ADMIN)

**Response 204:** Member removed.

---

### GET /groups/:groupId/recommendations

Get AI-powered movie recommendations for the group.

**Auth required:** Yes (group participant)

**Response 200:**
```json
{
  "recommendations": [
    {
      "tmdbId": 438631,
      "title": "Dune",
      "score": 0.92,
      "explanation": "Unwatched by all members; matches Action and Sci-Fi preferences."
    }
  ]
}
```

---

## Sessions

### GET /groups/:groupId/sessions

List all sessions in the group.

**Auth required:** Yes (group participant)

**Response 200:** `{ "sessions": Session[] }`

---

### POST /groups/:groupId/sessions

Create a new movie night session.

**Auth required:** Yes (group participant)

**Request body:**
```json
{
  "scheduledAt": "2025-05-16T20:00:00Z",
  "movieTmdbId": null
}
```

**Response 201:** Created `Session`.

---

### GET /groups/:groupId/sessions/:sessionId

Get session details.

**Auth required:** Yes (group participant)

**Response 200:** `Session` object.

---

### PATCH /groups/:groupId/sessions/:sessionId

Update session date/time or select the movie.

**Auth required:** Yes (group ADMIN)

**Request body (all optional):**
```json
{ "scheduledAt": "2025-05-17T20:00:00Z", "movieTmdbId": 27205 }
```

**Response 200:** Updated `Session`.

---

### DELETE /groups/:groupId/sessions/:sessionId

Delete a session and all its votes.

**Auth required:** Yes (group ADMIN)

**Response 204:** Deleted.

---

## Votes

### POST /groups/:groupId/sessions/:sessionId/votes

Cast a vote for a movie in this session. Each user may have at most one vote per session (subsequent calls replace the previous vote).

**Auth required:** Yes (group participant)

**Request body:**
```json
{ "movieTmdbId": 27205 }
```

**Response 201:** Created/updated `Vote`.

---

### GET /groups/:groupId/sessions/:sessionId/votes

Get aggregated vote results plus the authenticated user's current vote.

**Auth required:** Yes (group participant)

**Response 200:**
```json
{
  "results": [
    { "movieTmdbId": 27205, "voteCount": 3 },
    { "movieTmdbId": 438631, "voteCount": 1 }
  ],
  "myVote": { "movieTmdbId": 27205 }
}
```

---

### PATCH /groups/:groupId/sessions/:sessionId/votes/me

Change the authenticated user's existing vote.

**Auth required:** Yes (group participant)

**Request body:**
```json
{ "movieTmdbId": 438631 }
```

**Response 200:** Updated `Vote`.

---

## Data Types Reference

```typescript
type User = {
  id: string;
  numericId: number | null;
  email: string;
  displayName: string;
  systemRole: "USER" | "SYSTEM_ADMIN";
  createdAt: string; // ISO 8601
};

type Group = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

type GroupMember = {
  id: string;
  userId: string;
  groupId: string;
  role: "MEMBER" | "ADMIN";
  joinedAt: string;
  user: Pick<User, "id" | "displayName" | "numericId">;
};

type Session = {
  id: string;
  groupId: string;
  scheduledAt: string;
  movieTmdbId: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

type Vote = {
  id: string;
  sessionId: string;
  userId: string;
  movieTmdbId: number;
  createdAt: string;
  updatedAt: string;
};

type WatchlistEntry = {
  id: string;
  userId: string;
  tmdbId: number;
  addedAt: string;
};

type MovieCatalogEntry = {
  id: string;
  title: string;
  tmdbId: number | null;
  genre: string | null;
  releaseYear: number | null;
  posterPath: string | null;
  synopsis: string | null;
  source: "TMDB" | "CUSTOM_ADMIN";
};
```
