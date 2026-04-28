import {
  cloneMockFriendLinks,
  cloneMockFriendNotifications,
  cloneMockFriendRequests,
  cloneMockGroups,
  cloneMockInvites,
} from "./mockData.js";

const GROUPS_STORAGE_KEY = "mnp.data.groups";
const GROUP_INVITES_STORAGE_KEY = "mnp.data.groupInvites";
const GROUP_INVITES_SEEDED_KEY = "mnp.data.groupInvites.seeded.v4";
const GROUP_INVITES_TRIMMED_KEY = "mnp.data.groupInvites.trimmed.v1";
const GROUP_JOIN_REQUESTS_STORAGE_KEY = "mnp.group.joinRequests";
const FRIEND_REQUESTS_STORAGE_KEY = "mnp.data.friendRequests";
const FRIEND_REQUESTS_SEEDED_KEY = "mnp.data.friendRequests.seeded.v4";
const FRIEND_REQUESTS_TRIMMED_KEY = "mnp.data.friendRequests.trimmed.v1";
const FRIEND_LINKS_STORAGE_KEY = "mnp.data.friendLinks";
const FRIEND_LINKS_SEEDED_KEY = "mnp.data.friendLinks.seeded.v2";
const FRIEND_NOTIFICATIONS_STORAGE_KEY = "mnp.data.friendNotifications";
const FRIEND_NOTIFICATIONS_SEEDED_KEY = "mnp.data.friendNotifications.seeded.v1";

const normalizeName = (value = "") => value.trim().toLowerCase();
const MAX_PENDING_DEMO_NOTIFICATIONS_PER_USER = 5;

export const DEFAULT_FRIEND_REQUESTS = [
  ...cloneMockFriendRequests(),
];
export const DEFAULT_FRIEND_LINKS = [...cloneMockFriendLinks()];
export const DEFAULT_FRIEND_NOTIFICATIONS = [
  ...cloneMockFriendNotifications(),
];

export { normalizeName };

function trimByUser(items, getUserName, limit = MAX_PENDING_DEMO_NOTIFICATIONS_PER_USER) {
  const counts = new Map();
  const kept = [];
  for (const item of items) {
    const userKey = normalizeName(getUserName(item));
    if (!userKey) continue;
    const nextCount = (counts.get(userKey) || 0) + 1;
    if (nextCount > limit) continue;
    counts.set(userKey, nextCount);
    kept.push(item);
  }
  return kept;
}

export function readLocalList(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function readGroups() {
  const storedGroups = readLocalList(GROUPS_STORAGE_KEY, []);
  const mockGroups = cloneMockGroups();
  const storedById = new Map((storedGroups || []).map((g) => [String(g.id), g]));
  const merged = [
    ...mockGroups.map((g) => storedById.get(String(g.id)) ?? g),
    ...storedGroups.filter((g) => !mockGroups.some((m) => String(m.id) === String(g.id))),
  ];

  if (merged.length !== storedGroups.length) {
    writeGroups(merged);
  }

  return merged;
}

export function writeGroups(groups) {
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

function makeGroupId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `G-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function createGroup({ name, leaderName, leaderUserId, isPrivate }) {
  const groups = readGroups();
  const trimmed = name.trim();
  if (!trimmed) return null;
  const id = makeGroupId();
  const next = {
    id,
    name: trimmed,
    isPrivate: Boolean(isPrivate),
    members: [
      {
        id: `m-${Date.now()}-${leaderUserId || "leader"}`,
        userId: String(leaderUserId || normalizeName(leaderName)),
        name: leaderName,
        avatar: (leaderName || "U").charAt(0).toUpperCase(),
        role: "creator",
      },
    ],
    createdAt: new Date().toISOString(),
  };
  writeGroups([...groups, next]);
  return next;
}

export function searchGroupsById(query, userName = "") {
  const q = String(query || "").trim().toLowerCase();
  const groups = readGroups();
  const mine = normalizeName(userName);
  return groups
    .filter((g) => !q || String(g.id).toLowerCase().includes(q))
    .map((g) => ({
      ...g,
      isMember: (g.members || []).some((m) => normalizeName(m.name) === mine),
    }));
}

export function readJoinRequests() {
  return readLocalList(GROUP_JOIN_REQUESTS_STORAGE_KEY, []);
}

export function writeJoinRequests(requests) {
  localStorage.setItem(GROUP_JOIN_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
}

export function getLeaderPendingJoinRequests(leaderName) {
  const groups = readGroups();
  const leaderGroupIds = groups
    .filter((g) =>
      (g.members || []).some(
        (m) => m.role === "creator" && normalizeName(m.name) === normalizeName(leaderName)
      )
    )
    .map((g) => g.id);
  return readJoinRequests().filter(
    (r) => r.status === "pending" && leaderGroupIds.includes(r.groupId)
  );
}

export function requestJoinGroup(groupId, requesterName, requesterUserId = "") {
  const groups = readGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { status: "not-found" };
  const alreadyMember = (group.members || []).some(
    (m) => normalizeName(m.name) === normalizeName(requesterName)
  );
  if (alreadyMember) return { status: "already-member" };

  if (!group.isPrivate) {
    const nextGroups = groups.map((g) =>
      g.id !== groupId
        ? g
        : {
            ...g,
            members: [
              ...(g.members || []),
              {
                id: `m-${Date.now()}-${requesterUserId || normalizeName(requesterName)}`,
                userId: String(requesterUserId || normalizeName(requesterName)),
                name: requesterName,
                avatar: (requesterName || "U").charAt(0).toUpperCase(),
                role: "member",
              },
            ],
          }
    );
    writeGroups(nextGroups);
    return { status: "joined" };
  }

  const all = readJoinRequests();
  const duplicate = all.some(
    (r) =>
      r.groupId === groupId &&
      normalizeName(r.requesterName) === normalizeName(requesterName) &&
      r.status === "pending"
  );
  if (duplicate) return { status: "pending" };

  const nextRequest = {
    id: `jr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    groupId,
    groupName: group.name,
    requesterName,
    requesterUserId: String(requesterUserId || normalizeName(requesterName)),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  writeJoinRequests([nextRequest, ...all]);
  return { status: "requested" };
}

export function approveJoinRequest(requestId) {
  const requests = readJoinRequests();
  const target = requests.find((r) => r.id === requestId && r.status === "pending");
  if (!target) return false;
  const groups = readGroups();
  const nextGroups = groups.map((g) =>
    g.id !== target.groupId
      ? g
      : {
          ...g,
          members: [
            ...(g.members || []),
            {
              id: `m-${Date.now()}-${target.requesterUserId}`,
              userId: target.requesterUserId,
              name: target.requesterName,
              avatar: (target.requesterName || "U").charAt(0).toUpperCase(),
              role: "member",
            },
          ],
        }
  );
  writeGroups(nextGroups);
  writeJoinRequests(
    requests.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r))
  );
  return true;
}

export function denyJoinRequest(requestId) {
  const requests = readJoinRequests();
  writeJoinRequests(
    requests.map((r) => (r.id === requestId ? { ...r, status: "denied" } : r))
  );
}

/**
 * Remove the current user from a group. Creators cannot leave this way (delete the group instead).
 */
export function leaveGroup(groupId, userName) {
  const groups = readGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { status: "not-found" };
  const mine = normalizeName(userName);
  const self = (group.members || []).find((m) => normalizeName(m.name) === mine);
  if (!self) return { status: "not-member" };
  if (self.role === "creator") return { status: "creator-cannot-leave" };
  const nextMembers = (group.members || []).filter((m) => normalizeName(m.name) !== mine);
  const nextGroups = groups.map((g) =>
    g.id === groupId ? { ...g, members: nextMembers } : g
  );
  writeGroups(nextGroups);
  return { status: "left" };
}

export function readInvites() {
  const storedInvites = readLocalList(GROUP_INVITES_STORAGE_KEY, []);
  const alreadyTrimmed = localStorage.getItem(GROUP_INVITES_TRIMMED_KEY) === "1";
  let normalizedInvites = storedInvites;
  if (!alreadyTrimmed) {
    normalizedInvites = trimByUser(
      storedInvites,
      (invite) => String(invite?.invitedUserName || ""),
      MAX_PENDING_DEMO_NOTIFICATIONS_PER_USER
    );
    if (normalizedInvites.length !== storedInvites.length) {
      writeInvites(normalizedInvites);
    }
    localStorage.setItem(GROUP_INVITES_TRIMMED_KEY, "1");
  }
  const alreadySeeded = localStorage.getItem(GROUP_INVITES_SEEDED_KEY) === "1";
  if (alreadySeeded) return normalizedInvites;
  const seededInvites = cloneMockInvites();
  if (seededInvites.length === 0) {
    localStorage.setItem(GROUP_INVITES_SEEDED_KEY, "1");
    return normalizedInvites;
  }

  const inviteKeys = new Set(
    normalizedInvites.map(
      (invite) =>
        `${String(invite.groupId)}::${normalizeName(invite.invitedUserName)}::${normalizeName(invite.inviterName)}`
    )
  );
  const missingInvites = seededInvites.filter(
    (invite) =>
      !inviteKeys.has(
        `${String(invite.groupId)}::${normalizeName(invite.invitedUserName)}::${normalizeName(invite.inviterName)}`
      )
  );
  const merged = missingInvites.length === 0 ? normalizedInvites : [...normalizedInvites, ...missingInvites];
  writeInvites(merged);
  localStorage.setItem(GROUP_INVITES_SEEDED_KEY, "1");
  return merged;
}

export function writeInvites(invites) {
  localStorage.setItem(GROUP_INVITES_STORAGE_KEY, JSON.stringify(invites));
}

export function readFriendRequests() {
  const storedRequests = readLocalList(FRIEND_REQUESTS_STORAGE_KEY, []);
  const alreadyTrimmed = localStorage.getItem(FRIEND_REQUESTS_TRIMMED_KEY) === "1";
  let normalizedRequests = storedRequests;
  if (!alreadyTrimmed) {
    normalizedRequests = trimByUser(
      storedRequests,
      (req) => String(req?.targetUserName || ""),
      MAX_PENDING_DEMO_NOTIFICATIONS_PER_USER
    );
    if (normalizedRequests.length !== storedRequests.length) {
      writeFriendRequests(normalizedRequests);
    }
    localStorage.setItem(FRIEND_REQUESTS_TRIMMED_KEY, "1");
  }
  const alreadySeeded = localStorage.getItem(FRIEND_REQUESTS_SEEDED_KEY) === "1";
  if (alreadySeeded) return normalizedRequests;
  if (DEFAULT_FRIEND_REQUESTS.length === 0) return normalizedRequests;
  const requestKeys = new Set(
    normalizedRequests
      .filter((req) => req.status === "pending")
      .map(
        (req) =>
          `${normalizeName(req.requesterName)}::${normalizeName(req.targetUserName)}::${req.status}`
      )
  );
  const missingRequests = DEFAULT_FRIEND_REQUESTS.filter(
    (req) =>
      !requestKeys.has(
        `${normalizeName(req.requesterName)}::${normalizeName(req.targetUserName)}::${req.status}`
      )
  );
  const merged =
    missingRequests.length === 0
      ? normalizedRequests
      : [...normalizedRequests, ...missingRequests.map((req) => ({ ...req }))];
  writeFriendRequests(merged);
  localStorage.setItem(FRIEND_REQUESTS_SEEDED_KEY, "1");
  return merged;
}

export function writeFriendRequests(requests) {
  localStorage.setItem(FRIEND_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
}

export function readFriendLinks() {
  const storedLinks = readLocalList(FRIEND_LINKS_STORAGE_KEY, []);
  const alreadySeeded = localStorage.getItem(FRIEND_LINKS_SEEDED_KEY) === "1";
  if (alreadySeeded) return storedLinks;
  if (DEFAULT_FRIEND_LINKS.length === 0) return storedLinks;
  const linkKeys = new Set(
    storedLinks.map(
      (link) => `${normalizeName(link.userName)}::${normalizeName(link.friendName)}`
    )
  );
  const missingLinks = DEFAULT_FRIEND_LINKS.filter(
    (link) => !linkKeys.has(`${normalizeName(link.userName)}::${normalizeName(link.friendName)}`)
  );
  const merged =
    missingLinks.length === 0
      ? storedLinks
      : [...storedLinks, ...missingLinks.map((link) => ({ ...link }))];
  writeFriendLinks(merged);
  localStorage.setItem(FRIEND_LINKS_SEEDED_KEY, "1");
  return merged;
}

export function writeFriendLinks(links) {
  localStorage.setItem(FRIEND_LINKS_STORAGE_KEY, JSON.stringify(links));
}

export function readFriendNotifications() {
  const stored = readLocalList(FRIEND_NOTIFICATIONS_STORAGE_KEY, []);
  const alreadySeeded = localStorage.getItem(FRIEND_NOTIFICATIONS_SEEDED_KEY) === "1";
  if (alreadySeeded) return stored;
  if (DEFAULT_FRIEND_NOTIFICATIONS.length === 0) return stored;

  const notificationKeys = new Set(
    stored.map((note) => `${normalizeName(note.userName)}::${String(note.message || "").trim()}`)
  );
  const missing = DEFAULT_FRIEND_NOTIFICATIONS.filter(
    (note) =>
      !notificationKeys.has(`${normalizeName(note.userName)}::${String(note.message || "").trim()}`)
  );
  const merged =
    missing.length === 0 ? stored : [...stored, ...missing.map((note) => ({ ...note }))];
  writeFriendNotifications(merged);
  localStorage.setItem(FRIEND_NOTIFICATIONS_SEEDED_KEY, "1");
  return merged;
}

export function writeFriendNotifications(notifications) {
  localStorage.setItem(FRIEND_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

export function pushFriendNotification(userName, message, type = "info") {
  const all = readFriendNotifications();
  writeFriendNotifications([
    {
      id: `fn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userName,
      message,
      type,
    },
    ...all,
  ]);
}

export function demoFriendPresence(displayName = "") {
  const key = normalizeName(displayName);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const statuses = ["active", "away", "busy", "active", "invisible"];
  const activityStatus = statuses[hash % statuses.length] || "active";
  const isOnline = activityStatus !== "invisible" && hash % 4 !== 0;
  return { activityStatus, isOnline };
}

function hasFriendLink(links, userName, friendName) {
  return links.some(
    (link) =>
      normalizeName(link.userName) === normalizeName(userName) &&
      normalizeName(link.friendName) === normalizeName(friendName)
  );
}

export function areFriends(userAName, userBName) {
  const links = readFriendLinks();
  return (
    hasFriendLink(links, userAName, userBName) || hasFriendLink(links, userBName, userAName)
  );
}

export function acceptInvite(inviteId, userName) {
  const invites = readInvites();
  const invite = invites.find((item) => item.id === inviteId);
  if (!invite) return;

  const groups = readGroups();
  const avatar = (userName || "Y").charAt(0).toUpperCase();
  const nextGroups = groups.map((group) => {
    if (group.id !== invite.groupId) return group;
    const alreadyMember = (group.members ?? []).some(
      (member) => normalizeName(member.name) === normalizeName(userName)
    );
    if (alreadyMember) return group;
    return {
      ...group,
      members: [
        ...(group.members ?? []),
        {
          id: `m-${Date.now()}-${userName}`,
          name: userName,
          avatar,
          role: "member",
        },
      ],
    };
  });

  writeGroups(nextGroups);
  writeInvites(invites.filter((item) => item.id !== inviteId));
}

export function denyInvite(inviteId) {
  const invites = readInvites();
  writeInvites(invites.filter((item) => item.id !== inviteId));
}

export function sendFriendRequest(requesterName, requesterId, targetUserName, targetUserId = "") {
  const links = readFriendLinks();
  if (hasFriendLink(links, requesterName, targetUserName)) {
    pushFriendNotification(requesterName, `${targetUserName} is already your friend.`, "already-friends");
    return "already-friends";
  }
  const all = readFriendRequests();
  const duplicate = all.some(
    (req) =>
      normalizeName(req.requesterName) === normalizeName(requesterName) &&
      normalizeName(req.targetUserName) === normalizeName(targetUserName) &&
      req.status === "pending"
  );
  if (duplicate) {
    pushFriendNotification(requesterName, `Friend request to ${targetUserName} is already pending.`, "duplicate-request");
    return "already-pending";
  }
  writeFriendRequests([
    ...all,
    {
      id: `fr-${Date.now()}-${requesterId}`,
      requesterName,
      requesterId: String(requesterId),
      targetUserName,
      targetUserId: String(targetUserId),
      status: "pending",
    },
  ]);
  pushFriendNotification(requesterName, `Friend request sent to ${targetUserName}.`, "request-sent");
  return "sent";
}

export function acceptFriendRequest(requestId) {
  const all = readFriendRequests();
  const target = all.find((req) => req.id === requestId);
  if (target) {
    const links = readFriendLinks();
    const nextLinks = [...links];
    if (!hasFriendLink(nextLinks, target.requesterName, target.targetUserName)) {
      nextLinks.push({
        userName: target.requesterName,
        userId: String(target.requesterId || ""),
        friendName: target.targetUserName,
        friendId: String(target.targetUserId || ""),
      });
    }
    if (!hasFriendLink(nextLinks, target.targetUserName, target.requesterName)) {
      nextLinks.push({
        userName: target.targetUserName,
        userId: String(target.targetUserId || ""),
        friendName: target.requesterName,
        friendId: String(target.requesterId || ""),
      });
    }
    writeFriendLinks(nextLinks);
    pushFriendNotification(target.requesterName, `${target.targetUserName} accepted your friend request.`, "request-accepted");
  }
  writeFriendRequests(all.filter((req) => req.id !== requestId));
}

export function denyFriendRequest(requestId) {
  const all = readFriendRequests();
  writeFriendRequests(all.filter((req) => req.id !== requestId));
}

