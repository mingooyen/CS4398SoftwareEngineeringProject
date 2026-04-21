import fs from 'fs';
import path from 'path';

/** How recently a user must have heartbeated to count as online. */
const ONLINE_WINDOW_MS = 90_000;

const dataDir = path.join(process.cwd(), 'data');
const presenceFile = path.join(dataDir, 'presence.json');

type PresenceFile = Record<string, number>;

let lastSeenByUserId: PresenceFile = {};
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(presenceFile, JSON.stringify(lastSeenByUserId), 'utf8');
    } catch (err) {
      console.error('[presence] failed to write', presenceFile, err);
    }
  }, 400);
}

export function initPresenceStore(): void {
  try {
    const raw = fs.readFileSync(presenceFile, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      lastSeenByUserId = parsed as PresenceFile;
    }
  } catch {
    lastSeenByUserId = {};
  }
}

export function touchPresence(userId: string): void {
  if (!userId) return;
  lastSeenByUserId[userId] = Date.now();
  scheduleSave();
}

export function isUserOnline(userId: string): boolean {
  const t = lastSeenByUserId[userId];
  if (typeof t !== 'number' || !Number.isFinite(t)) return false;
  return Date.now() - t < ONLINE_WINDOW_MS;
}
