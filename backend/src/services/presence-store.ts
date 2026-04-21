import fs from 'fs';
import path from 'path';

/** How recently a user must have heartbeated to count as online. */
const ONLINE_WINDOW_MS = 90_000;

const dataDir = path.join(process.cwd(), 'data');
const presenceFile = path.join(dataDir, 'presence.json');

export type ActivityStatus = 'active' | 'away' | 'busy' | 'invisible';

type PresencePayload = {
  lastSeenByUserId: Record<string, number>;
  activityStatusByUserId: Record<string, ActivityStatus>;
};

let lastSeenByUserId: Record<string, number> = {};
let activityStatusByUserId: Record<string, ActivityStatus> = {};
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(
        presenceFile,
        JSON.stringify({ lastSeenByUserId, activityStatusByUserId } satisfies PresencePayload),
        'utf8'
      );
    } catch (err) {
      console.error('[presence] failed to write', presenceFile, err);
    }
  }, 400);
}

export function initPresenceStore(): void {
  try {
    const raw = fs.readFileSync(presenceFile, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'lastSeenByUserId' in parsed) {
      const payload = parsed as PresencePayload;
      lastSeenByUserId = payload.lastSeenByUserId ?? {};
      activityStatusByUserId = payload.activityStatusByUserId ?? {};
      return;
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Backward compatibility with older file format.
      lastSeenByUserId = parsed as Record<string, number>;
      activityStatusByUserId = {};
      return;
    }
  } catch {
    lastSeenByUserId = {};
    activityStatusByUserId = {};
  }
}

export function touchPresence(userId: string): void {
  if (!userId) return;
  lastSeenByUserId[userId] = Date.now();
  scheduleSave();
}

export function isUserOnline(userId: string): boolean {
  if (getActivityStatus(userId) === 'invisible') return false;
  const t = lastSeenByUserId[userId];
  if (typeof t !== 'number' || !Number.isFinite(t)) return false;
  return Date.now() - t < ONLINE_WINDOW_MS;
}

export function setActivityStatus(userId: string, status: ActivityStatus): void {
  if (!userId) return;
  activityStatusByUserId[userId] = status;
  scheduleSave();
}

export function getActivityStatus(userId: string): ActivityStatus {
  const value = activityStatusByUserId[userId];
  if (value === 'away' || value === 'busy' || value === 'invisible') return value;
  return 'active';
}
