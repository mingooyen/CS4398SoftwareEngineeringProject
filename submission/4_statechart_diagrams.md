# System Statechart Diagrams — Movie Night Planner

All diagrams use Mermaid `stateDiagram-v2` syntax. Render in any Mermaid-compatible viewer.

---

## 1. User Authentication State

Covers the lifecycle of a user's session from unauthenticated to authenticated and back.

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated : App loads (no token)

    Unauthenticated --> Registering : User submits registration form
    Registering --> Authenticated : POST /auth/register succeeds (tokens set)
    Registering --> Unauthenticated : Validation error / email conflict

    Unauthenticated --> LoggingIn : User submits login form
    LoggingIn --> Authenticated : POST /auth/login succeeds (tokens set)
    LoggingIn --> Unauthenticated : Wrong credentials / error

    Authenticated --> RefreshingToken : Access token expires (401 detected)
    RefreshingToken --> Authenticated : POST /auth/refresh succeeds (new tokens)
    RefreshingToken --> Unauthenticated : Refresh token expired / revoked

    Authenticated --> Unauthenticated : User clicks Logout (POST /auth/logout, tokens cleared)
```

---

## 2. Friendship Request Lifecycle

Covers the state of a friendship record between two users.

```mermaid
stateDiagram-v2
    [*] --> NonExistent : No relationship between users

    NonExistent --> PendingRequest : User A sends friend request\nPOST /users/friend-requests

    PendingRequest --> Accepted : User B accepts\nPOST /users/friend-requests/:id/accept
    PendingRequest --> Denied : User B denies\nPOST /users/friend-requests/:id/deny
    PendingRequest --> NonExistent : Request withdrawn (future feature)

    Accepted --> Blocked : Either user blocks the other (future feature)
    Accepted --> NonExistent : Either user removes friend (future feature)

    Denied --> NonExistent : Denial acknowledged
    Blocked --> NonExistent : Block lifted (future feature)
```

---

## 3. Group Membership Lifecycle

Covers how a user's membership in a group progresses.

```mermaid
stateDiagram-v2
    [*] --> NotMember : User has no relation to group

    NotMember --> Member : User joins via POST /groups/:id/join
    NotMember --> InvitePending : Group admin sends invite\nPOST /groups/:id/invites

    InvitePending --> Member : User accepts invite
    InvitePending --> NotMember : User declines invite
    InvitePending --> NotMember : Invite expires

    Member --> Admin : Group creator promotes user (future feature)
    Admin --> Member : Admin role revoked (future feature)

    Member --> NotMember : User leaves via POST /groups/:id/leave
    Admin --> NotMember : Admin leaves group
    Member --> NotMember : Removed by group admin\nPOST /groups/:id/members/:userId/remove
    Admin --> NotMember : Removed by group admin or system admin
```

---

## 4. Movie Night Session Lifecycle

Covers the state of a session from creation to completion.

```mermaid
stateDiagram-v2
    [*] --> Created : Group admin creates session\nPOST /groups/:id/sessions\n(scheduledAt set, movieTmdbId optional)

    Created --> VotingOpen : Session has no movie selected yet\n(movieTmdbId is null — open for votes)

    VotingOpen --> VotingOpen : Members cast / change votes\nPOST or PATCH /sessions/:id/votes/me

    VotingOpen --> MovieSelected : Admin picks movie from vote results\nPATCH /sessions/:id { movieTmdbId }

    Created --> MovieSelected : Admin creates session with movie pre-selected

    MovieSelected --> Completed : scheduledAt datetime passes\n(system marks completed — future feature)
    VotingOpen --> Completed : scheduledAt passes without selection\n(recorded as-is)

    Created --> Cancelled : Admin deletes session\nDELETE /sessions/:id
    VotingOpen --> Cancelled : Admin deletes session
    MovieSelected --> Cancelled : Admin deletes session

    Completed --> [*]
    Cancelled --> [*]
```

---

## 5. Vote Lifecycle Within a Session

Covers the state of a single user's vote within one session.

```mermaid
stateDiagram-v2
    [*] --> NoVote : Session created; user has not voted

    NoVote --> VoteCast : User casts vote\nPOST /sessions/:id/votes { movieTmdbId }

    VoteCast --> VoteChanged : User changes vote\nPATCH /sessions/:id/votes/me { movieTmdbId }

    VoteChanged --> VoteChanged : User changes vote again

    VoteCast --> [*] : Session completed or cancelled
    VoteChanged --> [*] : Session completed or cancelled
    NoVote --> [*] : Session completed without user voting
```

---

## 6. Movie Watchlist Entry Lifecycle

Covers a movie's state in a user's personal watchlist.

```mermaid
stateDiagram-v2
    [*] --> NotOnWatchlist : Movie not yet saved by user

    NotOnWatchlist --> OnWatchlist : User adds movie\nPOST /movies/watchlist { tmdbId }

    OnWatchlist --> NotOnWatchlist : User removes movie\nDELETE /movies/watchlist/:tmdbId

    OnWatchlist --> WatchedUnrated : User marks watched (no rating)\nPOST /movies/watched { tmdbId }

    OnWatchlist --> WatchedRated : User marks watched with rating\nPOST /movies/watched { tmdbId, rating }

    NotOnWatchlist --> WatchedUnrated : User marks watched directly
    NotOnWatchlist --> WatchedRated : User marks watched with rating

    WatchedUnrated --> WatchedRated : User adds/updates rating
    WatchedRated --> WatchedRated : User updates rating (upsert)
```

---

## 7. Group Invite Lifecycle

Covers the state of a group invite sent from an admin to a potential member.

```mermaid
stateDiagram-v2
    [*] --> Pending : Admin sends invite\nPOST /groups/:id/invites

    Pending --> Accepted : Invitee accepts\n(user becomes GroupMember)
    Pending --> Declined : Invitee declines
    Pending --> Expired : expiresAt timestamp passes

    Accepted --> [*]
    Declined --> [*]
    Expired --> [*]
```
