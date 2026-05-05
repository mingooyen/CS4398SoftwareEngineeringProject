// Movie Night Planner — Presentation Generator
const PptxGenJS = require("C:/Users/mingu/AppData/Roaming/npm/node_modules/pptxgenjs");

const pres = new PptxGenJS();
pres.layout = "LAYOUT_16x9";
pres.title = "Movie Night Planner";
pres.author = "CS4398 Team";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  dark:    "0F1624",   // near-black navy (background)
  navy:    "14213D",   // deep navy (content bg)
  accent:  "E94560",   // cinema red
  teal:    "0D9488",   // teal highlight
  white:   "FFFFFF",
  silver:  "B0BEC5",
  light:   "E8EAF0",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function darkSlide(slide) {
  slide.background = { color: C.dark };
}

function addTitle(slide, text, y = 0.28) {
  slide.addText(text, {
    x: 0.5, y, w: 9, h: 0.65,
    fontSize: 32, bold: true, color: C.white, fontFace: "Calibri",
    align: "left", margin: 0,
  });
  // accent bar under title
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: y + 0.68, w: 9, h: 0.025,
    fill: { color: C.accent }, line: { color: C.accent },
  });
}

function addBullets(slide, items, opts = {}) {
  const {
    x = 0.55, y = 1.25, w = 8.9, h = 3.8,
    fontSize = 15, color = C.light, indent = 0,
  } = opts;

  const runs = items.map((txt, i) => ({
    text: txt,
    options: {
      bullet: { indent: indent * 0.3 },
      color,
      fontSize,
      breakLine: i < items.length - 1,
      paraSpaceAfter: 6,
    },
  }));

  slide.addText(runs, {
    x, y, w, h,
    fontFace: "Calibri",
    valign: "top",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 1 — Title
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);

  // Big cinema-red accent block on left
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  s.addText("Movie Night Planner", {
    x: 0.5, y: 1.5, w: 9, h: 1.2,
    fontSize: 54, bold: true, color: C.white, fontFace: "Calibri",
    align: "left", margin: 0,
  });
  s.addText("CS4398 Software Engineering — Final Presentation", {
    x: 0.5, y: 2.85, w: 9, h: 0.5,
    fontSize: 20, color: C.silver, fontFace: "Calibri", align: "left", margin: 0,
  });
  s.addText("May 12, 2025", {
    x: 0.5, y: 3.45, w: 9, h: 0.4,
    fontSize: 16, color: C.teal, fontFace: "Calibri", align: "left", margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 2 — System Purpose
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "System Purpose");

  const bullets = [
    "Collaborative web app for planning movie nights with friend groups",
    "Core features: user auth, friend system, groups, sessions, voting, AI recommendations, watchlists",
    "Problem: deciding what to watch as a group is tedious — this app automates suggestions and voting",
    "Target users: friend groups who regularly watch movies together",
  ];
  addBullets(s, bullets, { y: 1.2, fontSize: 16 });

  // decorative box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.2, y: 1.3, w: 2.5, h: 3.5,
    fill: { color: C.navy }, line: { color: C.teal, width: 1.5 },
  });
  s.addText([
    { text: "🎬", options: { breakLine: true, fontSize: 40 } },
    { text: "Watch Together\nVote Together\nDecide Together", options: { fontSize: 13, color: C.silver } },
  ], {
    x: 7.2, y: 1.5, w: 2.5, h: 3.0,
    align: "center", valign: "middle", fontFace: "Calibri",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 3 — Tech Stack
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "Technology Stack");

  // Left column header
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.2, w: 4.2, h: 0.42,
    fill: { color: C.teal }, line: { color: C.teal },
  });
  s.addText("Frontend", {
    x: 0.5, y: 1.2, w: 4.2, h: 0.42,
    fontSize: 15, bold: true, color: C.white, align: "center", valign: "middle",
    fontFace: "Calibri", margin: 0,
  });

  const fe = ["React 19 + Vite", "JavaScript / JSX", "Fetch API with httpOnly cookie auth", "Component-based SPA (single-page app)"];
  addBullets(s, fe, { x: 0.6, y: 1.75, w: 4.0, h: 3.0, fontSize: 14 });

  // Right column header
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.2, w: 4.2, h: 0.42,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  s.addText("Backend", {
    x: 5.2, y: 1.2, w: 4.2, h: 0.42,
    fontSize: 15, bold: true, color: C.white, align: "center", valign: "middle",
    fontFace: "Calibri", margin: 0,
  });

  const be = [
    "Node.js + Express + TypeScript",
    "Prisma ORM + MongoDB",
    "JWT access + refresh token auth",
    "Zod schema validation",
    "OpenAI API (recommendations)",
    "TMDB API (movie metadata)",
  ];
  addBullets(s, be, { x: 5.3, y: 1.75, w: 4.0, h: 3.0, fontSize: 14 });

  // Divider
  s.addShape(pres.shapes.LINE, {
    x: 4.9, y: 1.2, w: 0, h: 4.0,
    line: { color: C.silver, width: 0.5 },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 4 — Architecture
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "Layered Backend Architecture");

  const layers = [
    { label: "HTTP Request", color: C.silver },
    { label: "Routes", color: C.teal },
    { label: "Middleware  (Auth · RBAC · Validation)", color: "F59E0B" },
    { label: "Controllers", color: C.teal },
    { label: "Services", color: C.teal },
    { label: "Repositories", color: C.teal },
    { label: "MongoDB (via Prisma)", color: "4CAF50" },
  ];

  const boxW = 8.0, boxH = 0.46, startX = 1.0, gap = 0.03;
  let curY = 1.15;
  layers.forEach((layer) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: startX, y: curY, w: boxW, h: boxH,
      fill: { color: layer.color, transparency: layer.color === C.silver ? 80 : 75 },
      line: { color: layer.color, width: 1 },
    });
    s.addText(layer.label, {
      x: startX, y: curY, w: boxW, h: boxH,
      fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle",
      fontFace: "Calibri", margin: 0,
    });
    curY += boxH + gap;
    if (layer.label !== "MongoDB (via Prisma)") {
      s.addShape(pres.shapes.LINE, {
        x: startX + boxW / 2, y: curY, w: 0, h: gap + 0.04,
        line: { color: C.silver, width: 1 },
      });
      curY += gap + 0.04;
    }
  });

  s.addText("Frontend SPA (React)  ↔  REST /api/v1  ↔  Express Backend  ↔  Prisma  ↔  MongoDB", {
    x: 0.5, y: 5.1, w: 9, h: 0.35,
    fontSize: 11, color: C.silver, align: "center", fontFace: "Calibri", italic: true, margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 5 — UML Class Diagram
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "UML Class Diagram — Key Models");

  const models = [
    { name: "User", desc: "id · email · displayName · systemRole", rel: "has → UserPreferences, WatchlistEntry[], WatchedEntry[], GroupMember[], Vote[]" },
    { name: "Group", desc: "id · name · slug · description", rel: "has → GroupMember[], Session[], GroupInvite[]" },
    { name: "GroupMember", desc: "groupId · userId · role: MEMBER|ADMIN", rel: "junction: User ↔ Group" },
    { name: "Session", desc: "groupId · scheduledAt · movieTmdbId?", rel: "has → Vote[]" },
    { name: "Vote", desc: "sessionId · userId · movieTmdbId", rel: "1 per user per session" },
    { name: "Friendship", desc: "requesterUserId · addresseeUserId · status", rel: "status: PENDING | ACCEPTED | BLOCKED" },
    { name: "MovieCatalogEntry", desc: "title · tmdbId · genre · source", rel: "source: TMDB | CUSTOM_ADMIN" },
  ];

  const colW = 4.4, rowH = 0.59, gap = 0.05;
  models.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * (colW + 0.7);
    const y = 1.15 + row * (rowH + gap);

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: colW, h: rowH,
      fill: { color: C.navy }, line: { color: C.teal, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: colW, h: 0.22,
      fill: { color: C.teal }, line: { color: C.teal },
    });
    s.addText(m.name, {
      x, y, w: colW, h: 0.22,
      fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle",
      fontFace: "Calibri", margin: 0,
    });
    s.addText(m.desc, {
      x: x + 0.05, y: y + 0.23, w: colW - 0.1, h: 0.18,
      fontSize: 9.5, color: C.light, fontFace: "Calibri", margin: 0,
    });
    s.addText(m.rel, {
      x: x + 0.05, y: y + 0.39, w: colW - 0.1, h: 0.18,
      fontSize: 9, color: C.silver, fontFace: "Calibri", italic: true, margin: 0,
    });
  });

  // last item (7th) in right of row 3
  s.addText("* Movies stored as tmdbId (int) only — metadata fetched on-demand from TMDB API", {
    x: 0.4, y: 5.2, w: 9.2, h: 0.28,
    fontSize: 10, color: C.silver, italic: true, fontFace: "Calibri", margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 6 — Statechart: Auth
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "Statechart: User Authentication");

  const states = [
    { x: 0.5, y: 1.4, label: "Unauthenticated", color: C.silver },
    { x: 3.9, y: 1.4, label: "Authenticated", color: C.teal },
    { x: 3.9, y: 3.2, label: "Refreshing Token", color: "F59E0B" },
  ];

  states.forEach(st => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: st.x, y: st.y, w: 2.5, h: 0.7,
      fill: { color: st.color, transparency: 60 },
      line: { color: st.color, width: 1.5 },
      rectRadius: 0.1,
    });
    s.addText(st.label, {
      x: st.x, y: st.y, w: 2.5, h: 0.7,
      fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle",
      fontFace: "Calibri", margin: 0,
    });
  });

  const arrows = [
    { label: "Register / Login", x: 3.0, y: 1.6, w: 0.9, h: 0 },
    { label: "Logout", x: 3.0, y: 2.0, w: 0.9, h: 0 },
    { label: "Token expires (401)", x: 6.4, y: 1.75, w: 0, h: 1.45 },
    { label: "Refresh OK", x: 3.9, y: 3.55, w: 2.5, h: 0 },
    { label: "Refresh expired →", x: 0.5, y: 3.55, w: 3.4, h: 0 },
  ];

  const arrowColors = [C.teal, C.accent, "F59E0B", C.teal, C.accent];
  arrows.forEach((a, i) => {
    s.addShape(pres.shapes.LINE, {
      x: a.x, y: a.y, w: a.w, h: a.h,
      line: { color: arrowColors[i], width: 1.5 },
    });
    s.addText(a.label, {
      x: a.x - 0.1, y: a.y - 0.25, w: Math.max(a.w + 0.2, 2.2), h: 0.25,
      fontSize: 10, color: C.silver, fontFace: "Calibri", align: "center", margin: 0,
    });
  });

  // Summary list
  const flows = [
    "Unauthenticated → [Register or Login] → Authenticated",
    "Authenticated → [Access token expires] → RefreshingToken → Authenticated",
    "RefreshingToken → [Refresh token revoked/expired] → Unauthenticated",
    "Authenticated → [Logout] → Unauthenticated",
    "Refresh token is one-time-use: rotation prevents stolen-token replay attacks",
  ];
  addBullets(s, flows, { x: 0.5, y: 4.3, w: 9, h: 1.1, fontSize: 12, color: C.silver });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 7 — Statechart: Session & Vote
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "Statechart: Session & Vote Lifecycle");

  // Session states row
  s.addText("SESSION", {
    x: 0.3, y: 1.2, w: 1.5, h: 0.4,
    fontSize: 11, bold: true, color: C.teal, fontFace: "Calibri", margin: 0,
  });

  const sessionStates = ["Created", "Voting Open", "Movie Selected", "Completed"];
  const sessionColors = [C.silver, C.teal, "4CAF50", C.accent];
  sessionStates.forEach((st, i) => {
    const x = 0.3 + i * 2.3;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.65, w: 2.0, h: 0.65,
      fill: { color: sessionColors[i], transparency: 65 },
      line: { color: sessionColors[i], width: 1.5 },
    });
    s.addText(st, {
      x, y: 1.65, w: 2.0, h: 0.65,
      fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle",
      fontFace: "Calibri", margin: 0,
    });
    if (i < sessionStates.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: x + 2.0, y: 1.97, w: 0.3, h: 0,
        line: { color: C.silver, width: 1.5 },
      });
    }
  });

  // Cancelled branch
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.8, y: 3.05, w: 2.0, h: 0.6,
    fill: { color: "7F1D1D", transparency: 30 },
    line: { color: C.accent, width: 1.5 },
  });
  s.addText("Cancelled", {
    x: 3.8, y: 3.05, w: 2.0, h: 0.6,
    fontSize: 13, bold: true, color: C.accent, align: "center", valign: "middle",
    fontFace: "Calibri", margin: 0,
  });
  s.addText("(DELETE /sessions/:id — admin at any point)", {
    x: 2.5, y: 3.7, w: 5, h: 0.3,
    fontSize: 10, color: C.silver, align: "center", italic: true, fontFace: "Calibri", margin: 0,
  });

  // Vote states row
  s.addText("VOTE (per user per session)", {
    x: 0.3, y: 4.15, w: 4, h: 0.35,
    fontSize: 11, bold: true, color: "F59E0B", fontFace: "Calibri", margin: 0,
  });

  const voteStates = ["No Vote", "Vote Cast", "Vote Changed"];
  const voteColors = [C.silver, C.teal, "F59E0B"];
  voteStates.forEach((st, i) => {
    const x = 0.3 + i * 3.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 4.55, w: 2.5, h: 0.6,
      fill: { color: voteColors[i], transparency: 65 },
      line: { color: voteColors[i], width: 1.5 },
    });
    s.addText(st, {
      x, y: 4.55, w: 2.5, h: 0.6,
      fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle",
      fontFace: "Calibri", margin: 0,
    });
    if (i < voteStates.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: x + 2.5, y: 4.85, w: 0.5, h: 0,
        line: { color: C.silver, width: 1.5 },
      });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 8 — Acceptance Test Cases
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "Acceptance Test Cases");

  const tests = [
    "AT-1: User Registration — new user registers, lands on homepage with session",
    "AT-2: Login / Logout — credentials accepted; session cleared on logout",
    "AT-3: Create Group — group created, creator is ADMIN",
    "AT-4: Invite Friend & Join Group — friend request sent/accepted; invite sent/accepted",
    "AT-5: Search & Watchlist — TMDB search results shown; movie added to watchlist",
    "AT-6: Create Session — session with date/time created under group",
    "AT-7: Vote on Movie — members cast votes; results aggregated in real time",
    "AT-8: AI Recommendations — group gets ranked suggestions with explanations",
    "AT-9: Admin Catalog — SYSTEM_ADMIN adds movie to global catalog",
    "AT-10: Mark Watched & Rate — user marks movie watched, submits 1–5 star rating",
  ];

  // Two-column layout
  const col1 = tests.slice(0, 5);
  const col2 = tests.slice(5);

  const makeRuns = (items) => items.map((txt, i) => ({
    text: txt,
    options: { bullet: true, color: C.light, fontSize: 12.5, breakLine: i < items.length - 1, paraSpaceAfter: 8 },
  }));

  s.addText(makeRuns(col1), { x: 0.4, y: 1.15, w: 4.5, h: 4.0, fontFace: "Calibri", valign: "top" });
  s.addText(makeRuns(col2), { x: 5.1, y: 1.15, w: 4.5, h: 4.0, fontFace: "Calibri", valign: "top" });

  s.addShape(pres.shapes.LINE, {
    x: 4.95, y: 1.15, w: 0, h: 4.0,
    line: { color: C.silver, width: 0.5 },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 9 — Git Network
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "Git Repository — Branches & Commits");

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.15, w: 9, h: 3.8,
    fill: { color: C.navy }, line: { color: C.teal, width: 1 },
  });
  s.addText([
    { text: "[ Insert GitHub Network graph screenshot here ]", options: { bold: true, color: C.silver, breakLine: true, fontSize: 16 } },
    { text: "\nNavigate to: GitHub Repo → Insights → Network", options: { color: C.silver, fontSize: 13, breakLine: true } },
    { text: "Take a screenshot and paste it onto this slide.", options: { color: C.silver, fontSize: 13 } },
  ], {
    x: 0.5, y: 1.15, w: 9, h: 3.8,
    align: "center", valign: "middle", fontFace: "Calibri", margin: 0,
  });

  const branches = [
    "main — stable production branch",
    "feature/backend — backend API development",
    "feature/frontend — React SPA development",
    "fix/* — bug fix branches merged into main via PR",
  ];
  addBullets(s, branches, { y: 5.1, h: 0.4, fontSize: 11, color: C.silver });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 10 — Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "Unit Test Coverage");

  const tests = [
    "Framework: Vitest (both frontend and backend packages)",
    "backend/src/utils/jwt.test.ts — sign/verify access and refresh tokens",
    "backend/src/dtos/schemas.test.ts — Zod DTO validation (valid/invalid payloads for all schemas)",
    "backend/src/database/schema.prisma.test.ts — Prisma schema structure validation",
    "frontend/src/App.test.jsx — top-level app render and route guards",
    "frontend/src/HomePage.test.jsx — home page component rendering",
    "frontend/src/GroupPage.test.jsx — group listing and navigation",
  ];
  addBullets(s, tests, { y: 1.15, fontSize: 15 });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.65, w: 9, h: 0.75,
    fill: { color: C.navy }, line: { color: C.teal, width: 1 },
  });
  s.addText("npm run test:backend  ·  npm run test:frontend  ·  npm run test:all", {
    x: 0.5, y: 4.65, w: 9, h: 0.75,
    fontSize: 13, color: C.teal, align: "center", valign: "middle",
    fontFace: "Consolas", bold: true, margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 11 — Screenshots
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);
  addTitle(s, "System Screenshots");

  const placeholders = [
    { x: 0.5,  y: 1.15, label: "Auth Page\n(Login / Register)" },
    { x: 5.0,  y: 1.15, label: "HomePage\n(Groups + Friends rail)" },
    { x: 0.5,  y: 3.15, label: "GroupDetailPage\n(Sessions + Voting)" },
    { x: 5.0,  y: 3.15, label: "Recommendations Tab\n(AI suggestions + scores)" },
  ];

  placeholders.forEach(p => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: p.x, y: p.y, w: 4.3, h: 1.9,
      fill: { color: C.navy }, line: { color: C.silver, width: 0.75 },
    });
    s.addText(p.label, {
      x: p.x, y: p.y, w: 4.3, h: 1.9,
      fontSize: 13, color: C.silver, align: "center", valign: "middle",
      fontFace: "Calibri", italic: true, margin: 0,
    });
  });

  s.addText("Replace placeholders above with screenshots taken from the running app", {
    x: 0.5, y: 5.15, w: 9, h: 0.3,
    fontSize: 10, color: C.silver, italic: true, align: "center", fontFace: "Calibri", margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Slide 12 — Summary (dark closing slide)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.accent }, line: { color: C.accent },
  });

  s.addText("Summary", {
    x: 0.5, y: 0.35, w: 9, h: 0.65,
    fontSize: 36, bold: true, color: C.white, fontFace: "Calibri", align: "left", margin: 0,
  });

  const points = [
    "Full-stack collaborative movie planning application",
    "Layered architecture: routes → controllers → services → repositories",
    "JWT dual-token auth with one-time-use refresh rotation",
    "Real-time vote aggregation per session (admin selects winner)",
    "AI-powered group recommendations via OpenAI (score + explanation)",
    "Friend system with online presence indicators",
    "10 acceptance test cases covering all core workflows",
    "Vitest unit tests: JWT utilities, Zod DTOs, schema, and React components",
  ];

  const runs = points.map((txt, i) => ({
    text: txt,
    options: { bullet: true, color: C.light, fontSize: 14.5, breakLine: i < points.length - 1, paraSpaceAfter: 5 },
  }));

  s.addText(runs, {
    x: 0.55, y: 1.15, w: 9, h: 4.2,
    fontFace: "Calibri", valign: "top",
  });
}

// ── Write file ────────────────────────────────────────────────────────────────
const outPath = "C:/Users/mingu/OneDrive/Desktop/school dump/CS4398 Software Engineering Project/CS4398SoftwareEngineeringProject/.claude/worktrees/elastic-sanderson-f97edd/submission/10_presentation.pptx";

pres.writeFile({ fileName: outPath })
  .then(() => console.log("Written: " + outPath))
  .catch(e => { console.error(e); process.exit(1); });
