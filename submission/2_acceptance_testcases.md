# Acceptance Test Cases — Movie Night Planner

Each test case below describes the steps to execute, the expected result, and notes on which windows and pop-ups are involved. Screenshots should be taken at each numbered step marked **[SCREENSHOT]**.

---

## AT-1: User Registration

**Precondition:** Backend and frontend dev servers are running. User has not registered before.

**Steps:**
1. Open the app in a browser at `http://localhost:5173`. **[SCREENSHOT]** — Landing/auth page is shown with Login and Register tabs.
2. Click the **Register** tab (or button). **[SCREENSHOT]** — Registration form appears with fields: Display Name, Email, Password.
3. Fill in: Display Name = `Alice`, Email = `alice@example.com`, Password = `Password123!`.
4. Click **Register**. **[SCREENSHOT]** — Success: user is redirected to the HomePage with a greeting showing "Alice".

**Expected Result:** Account is created; JWT access/refresh tokens are set; user lands on the homepage.

**Windows/Pop-ups:** Auth page → Register form → HomePage.

---

## AT-2: User Login and Logout

**Precondition:** User `alice@example.com` exists (from AT-1).

**Steps:**
1. Navigate to `http://localhost:5173`. If already logged in, log out first.
2. Click the **Login** tab. **[SCREENSHOT]** — Login form with Email and Password fields.
3. Enter `alice@example.com` / `Password123!`. Click **Login**. **[SCREENSHOT]** — HomePage is shown with Alice's name visible in the header.
4. Click the **Logout** button (top-right). **[SCREENSHOT]** — User is redirected back to the Auth/Login page; session is cleared.

**Expected Result:** Login sets session; logout clears it and redirects.

---

## AT-3: Create a Group

**Precondition:** Logged in as Alice.

**Steps:**
1. From the HomePage, click **Create Group** (or navigate to Groups page). **[SCREENSHOT]** — Group creation modal or form opens with fields: Group Name, Description.
2. Enter Name = `Weekend Watchers`, Description = `Our Friday movie group`. **[SCREENSHOT]** — Form filled in.
3. Click **Create**. **[SCREENSHOT]** — New group `Weekend Watchers` appears in the groups list; Alice is shown as ADMIN.

**Expected Result:** Group is created with Alice as admin. `POST /api/v1/groups` returns 201.

**Windows/Pop-ups:** Group creation modal → Groups list updated.

---

## AT-4: Invite a Friend and Join Group

**Precondition:** Alice is logged in. A second user `bob@example.com` (Bob) is registered separately.

**Steps:**
1. Alice navigates to the **Friends** tab on the HomePage. **[SCREENSHOT]** — Friends panel shown (may be empty).
2. Alice searches for Bob by name or numeric ID. **[SCREENSHOT]** — Bob appears in search results.
3. Alice clicks **Add Friend**. **[SCREENSHOT]** — Friend request sent confirmation shown.
4. Bob logs in and navigates to **Friend Requests**. **[SCREENSHOT]** — Pending request from Alice is visible.
5. Bob clicks **Accept**. **[SCREENSHOT]** — Alice and Bob are now friends; Alice appears in Bob's friends list with online/offline indicator.
6. Alice opens `Weekend Watchers` group detail and clicks **Invite Member**. **[SCREENSHOT]** — Invite modal opens with Bob listed under "Friends".
7. Alice selects Bob and clicks **Invite**. **[SCREENSHOT]** — Invite sent confirmation.
8. Bob sees the group invite notification and clicks **Accept**. **[SCREENSHOT]** — Bob is now a MEMBER of `Weekend Watchers`.

**Expected Result:** Friendship established; group invite accepted; Bob appears in group members list.

**Windows/Pop-ups:** Friend search pop-up → friend request notification → group detail → invite modal → Bob's invite notification.

---

## AT-5: Search and Add Movie to Watchlist

**Precondition:** Logged in as Alice.

**Steps:**
1. Navigate to the movie search feature (search bar on HomePage or Movies page). **[SCREENSHOT]** — Movie search input is visible.
2. Type `Inception`. **[SCREENSHOT]** — Results list appears showing movie cards with posters, title, and year.
3. Click on the **Inception** movie card. **[SCREENSHOT]** — Movie detail view or modal opens showing synopsis, genres, release year, and poster.
4. Click **Add to Watchlist**. **[SCREENSHOT]** — Button changes to "In Watchlist" / success indicator.
5. Navigate to the Watchlist section. **[SCREENSHOT]** — Inception appears in Alice's watchlist.

**Expected Result:** `POST /api/v1/movies/watchlist` returns 201; movie is shown in watchlist.

**Windows/Pop-ups:** Search results overlay → movie detail modal/page → watchlist page.

---

## AT-6: Create a Movie Night Session

**Precondition:** Alice is ADMIN of `Weekend Watchers`.

**Steps:**
1. Open the `Weekend Watchers` group detail page. **[SCREENSHOT]** — Group detail shown with Members, Sessions, and Recommendations tabs.
2. Click **New Session**. **[SCREENSHOT]** — Session creation modal opens with fields: Date/Time, Movie (optional).
3. Set Date = next Friday, Time = 8:00 PM. Leave movie blank (to be decided by vote). Click **Create Session**. **[SCREENSHOT]** — Session card appears in the Sessions list: "Friday Movie Night — 8:00 PM — Movie TBD".

**Expected Result:** `POST /api/v1/groups/:id/sessions` returns 201; session appears in list.

**Windows/Pop-ups:** Group detail page → session creation modal → sessions list updated.

---

## AT-7: Vote on a Movie for a Session

**Precondition:** Session exists in `Weekend Watchers`. Both Alice and Bob are members. Two movies have been suggested (e.g., from the recommendations list).

**Steps:**
1. Alice opens the session detail. **[SCREENSHOT]** — Session detail shows the voting panel with movie options.
2. Alice clicks **Vote** next to `Inception`. **[SCREENSHOT]** — Alice's vote is confirmed; vote count updates.
3. Bob opens the same session. **[SCREENSHOT]** — Bob sees the same voting panel; Alice's vote count is visible.
4. Bob clicks **Vote** next to `The Dark Knight`. **[SCREENSHOT]** — Bob's vote registered.
5. Both users can see the results panel. **[SCREENSHOT]** — Vote results: `Inception: 1`, `The Dark Knight: 1`.

**Expected Result:** Votes are recorded; results reflect real-time counts.

**Windows/Pop-ups:** Session detail page → voting panel → results panel.

---

## AT-8: View AI Recommendations

**Precondition:** Alice and Bob have watched history or watchlist entries. Both are members of `Weekend Watchers`.

**Steps:**
1. Alice opens `Weekend Watchers` and clicks the **Recommendations** tab. **[SCREENSHOT]** — Loading state shown briefly.
2. Recommendations list appears. **[SCREENSHOT]** — Each recommendation card shows: movie title, poster, score percentage, and a short AI-generated explanation (e.g., "Both members enjoy action films and this is unwatched by the group").
3. Alice clicks **Add to Session** on one recommendation to attach it to the upcoming session. **[SCREENSHOT]** — Movie is now linked to the session.

**Expected Result:** `GET /api/v1/groups/:id/recommendations` returns ranked list with scores and explanations.

**Windows/Pop-ups:** Group detail → Recommendations tab → recommendation cards.

---

## AT-9: Admin — Add Movie to Catalog

**Precondition:** A SYSTEM_ADMIN user is logged in.

**Steps:**
1. Admin opens the **Admin Controls** modal (accessible from the homepage header). **[SCREENSHOT]** — Admin modal opens showing system-wide controls: All Groups, Add Movie to Catalog.
2. Admin clicks **Add Movie**. **[SCREENSHOT]** — Add movie form appears with fields: Title, TMDB ID, Genre, Release Year, Poster URL.
3. Admin enters data for a movie and clicks **Add**. **[SCREENSHOT]** — Success message; movie appears in the catalog.

**Expected Result:** `POST /api/v1/movies/catalog` (system admin only) returns 201.

**Windows/Pop-ups:** Admin controls modal → add movie form → success confirmation.

---

## AT-10: Mark Movie as Watched and Rate It

**Precondition:** Logged in as Alice. Inception is in her watchlist.

**Steps:**
1. Navigate to Alice's Watchlist page. **[SCREENSHOT]** — Inception visible with "Mark Watched" button.
2. Click **Mark Watched** on Inception. **[SCREENSHOT]** — Rating dialog appears with a 1–5 star selector.
3. Select 5 stars and click **Submit**. **[SCREENSHOT]** — Movie moves to "Watched" state; star rating displayed. Watchlist count decreases.

**Expected Result:** `POST /api/v1/movies/watched` with `{ tmdbId, rating: 5 }` returns 201. Rating saved.

**Windows/Pop-ups:** Watchlist page → rating dialog/modal → watched confirmation.
