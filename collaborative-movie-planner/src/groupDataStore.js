const GROUPS_STORAGE_KEY = "mnp.mock.groups";
const GROUP_INVITES_STORAGE_KEY = "mnp.mock.groupInvites";
const FRIEND_REQUESTS_STORAGE_KEY = "mnp.mock.friendRequests";
const FRIEND_LINKS_STORAGE_KEY = "mnp.mock.friendLinks";
const FRIEND_NOTIFICATIONS_STORAGE_KEY = "mnp.mock.friendNotifications";

const normalizeName = (value = "") => value.trim().toLowerCase();

export const DEFAULT_GROUPS = [
  {
    id: "g-1",
    name: "Friday Night Crew",
    members: [
      { id: 1, name: "Mi", avatar: "M", role: "creator" },
      { id: 2, name: "Xavier", avatar: "X", role: "member" },
      { id: 3, name: "Nivah", avatar: "N", role: "member" },
    ],
  },
  {
    id: "g-2",
    name: "Saturday Sci-Fi Club",
    members: [
      { id: 11, name: "Jordan", avatar: "J", role: "creator" },
      { id: 12, name: "Alex", avatar: "A", role: "member" },
      { id: 13, name: "Sam", avatar: "S", role: "member" },
      { id: 14, name: "Terry", avatar: "T", role: "member" },
    ],
  },
];

export const DEFAULT_GROUP_INVITES = [
  {
    id: "gi-1",
    groupId: "g-2",
    groupName: "Saturday Sci-Fi Club",
    invitedUserName: "Xavier",
    inviterName: "Jordan",
  },
  {
    id: "gi-2",
    groupId: "g-1",
    groupName: "Friday Night Crew",
    invitedUserName: "Nivah",
    inviterName: "Mi",
  },
];
export const DEFAULT_FRIEND_REQUESTS = [
  {
    id: "fr-1",
    requesterName: "Mi",
    requesterId: "1001",
    targetUserName: "Xavier",
    status: "pending",
  },
];
export const DEFAULT_FRIEND_LINKS = [
  {
    userName: "Xavier",
    userId: "1000",
    friendName: "Mi",
    friendId: "1001",
  },
  {
    userName: "Mi",
    userId: "1001",
    friendName: "Xavier",
    friendId: "1000",
  },
];
export const DEFAULT_FRIEND_NOTIFICATIONS = [
  {
    id: "fn-1",
    userName: "Xavier",
    message: "Mi is already your friend.",
    type: "already-friends",
  },
];

export { normalizeName };

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
  return readLocalList(GROUPS_STORAGE_KEY, DEFAULT_GROUPS);
}

export function writeGroups(groups) {
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

export function readInvites() {
  return readLocalList(GROUP_INVITES_STORAGE_KEY, DEFAULT_GROUP_INVITES);
}

export function writeInvites(invites) {
  localStorage.setItem(GROUP_INVITES_STORAGE_KEY, JSON.stringify(invites));
}

export function readFriendRequests() {
  return readLocalList(FRIEND_REQUESTS_STORAGE_KEY, DEFAULT_FRIEND_REQUESTS);
}

export function writeFriendRequests(requests) {
  localStorage.setItem(FRIEND_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
}

export function readFriendLinks() {
  return readLocalList(FRIEND_LINKS_STORAGE_KEY, DEFAULT_FRIEND_LINKS);
}

export function writeFriendLinks(links) {
  localStorage.setItem(FRIEND_LINKS_STORAGE_KEY, JSON.stringify(links));
}

export function readFriendNotifications() {
  return readLocalList(FRIEND_NOTIFICATIONS_STORAGE_KEY, DEFAULT_FRIEND_NOTIFICATIONS);
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

