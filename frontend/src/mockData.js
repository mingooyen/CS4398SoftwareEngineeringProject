function makeAvatar(name = "") {
  return (name || "U").trim().charAt(0).toUpperCase() || "U";
}

function member(id, userId, name, role = "member") {
  return {
    id,
    userId,
    name,
    avatar: makeAvatar(name),
    role,
  };
}

export const MOCK_GROUPS = [
  {
    id: "G-MOCK-A7K29X",
    name: "Friday Horror Circle",
    isPrivate: true,
    members: [
      member("m-mock-001", "u-mock-1001", "Avery", "creator"),
      member("m-mock-002", "u-mock-1002", "Nora"),
      member("m-mock-003", "u-mock-1003", "Jonah"),
      member("m-mock-004", "u-mock-1004", "Parker"),
    ],
    createdAt: "2026-03-04T18:10:00.000Z",
  },
  {
    id: "G-MOCK-B4N11Q",
    name: "Weekend Family Picks",
    isPrivate: false,
    members: [
      member("m-mock-005", "u-mock-1005", "Kai", "creator"),
      member("m-mock-006", "u-mock-1006", "Mina"),
      member("m-mock-007", "u-mock-1007", "Eli"),
      member("m-mock-008", "u-mock-1008", "Rae"),
      member("m-mock-009", "u-mock-1009", "Soren"),
    ],
    createdAt: "2026-03-12T20:45:00.000Z",
  },
  {
    id: "G-MOCK-C8T55L",
    name: "Sci-Fi Deep Dive",
    isPrivate: true,
    members: [
      member("m-mock-010", "u-mock-1010", "Luca", "creator"),
      member("m-mock-011", "u-mock-1011", "Zara"),
      member("m-mock-012", "u-mock-1012", "Beck"),
    ],
    createdAt: "2026-03-20T22:00:00.000Z",
  },
  {
    id: "G-MOCK-D9P60R",
    name: "Comedy + Pizza Crew",
    isPrivate: false,
    members: [
      member("m-mock-013", "u-mock-1013", "Theo", "creator"),
      member("m-mock-014", "u-mock-1014", "Iris"),
      member("m-mock-015", "u-mock-1015", "Maddox"),
      member("m-mock-016", "u-mock-1016", "Skye"),
    ],
    createdAt: "2026-04-01T19:25:00.000Z",
  },
];

export function cloneMockGroups() {
  return MOCK_GROUPS.map((group) => ({
    ...group,
    members: (group.members || []).map((m) => ({ ...m })),
  }));
}

const BASE_DEMO_USERS = [
  { name: "Admin", userId: "u-demo-admin" },
  { name: "Mi", userId: "u-demo-mi" },
  { name: "Xavier", userId: "u-demo-xavier" },
];

function uniqueUsers(users) {
  const seen = new Set();
  const deduped = [];
  for (const user of users) {
    const name = String(user?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      name,
      userId: String(user?.userId || `u-demo-${key.replace(/[^a-z0-9]+/g, "-")}`),
    });
  }
  return deduped;
}

export const MOCK_USERS = uniqueUsers([
  ...BASE_DEMO_USERS,
  ...MOCK_GROUPS.flatMap((group) =>
    (group.members || []).map((member) => ({
      name: member.name,
      userId: String(member.userId || member.id || ""),
    }))
  ),
]);

function getUserByName(name) {
  return MOCK_USERS.find((user) => user.name.toLowerCase() === String(name || "").trim().toLowerCase());
}

export function cloneMockInvites() {
  const invites = [];
  if (MOCK_USERS.length < 2 || MOCK_GROUPS.length === 0) return invites;
  const invitesPerUser = new Map();
  const canAddInviteFor = (userName) => (invitesPerUser.get(userName.toLowerCase()) || 0) < 5;
  const trackInviteFor = (userName) => {
    const key = userName.toLowerCase();
    invitesPerUser.set(key, (invitesPerUser.get(key) || 0) + 1);
  };
  for (const user of MOCK_USERS) {
    if (!canAddInviteFor(user.name)) continue;
    const candidateGroups = MOCK_GROUPS.filter(
      (group) =>
        !(group.members || []).some(
          (member) => member.name.toLowerCase() === user.name.toLowerCase()
        )
    );
    for (const group of candidateGroups.slice(0, 2)) {
      if (!canAddInviteFor(user.name)) break;
      const invitedBy = group.members?.[0]?.name || "Admin";
      invites.push({
        id: `gi-mock-${String(invites.length + 1).padStart(3, "0")}`,
        groupId: group.id,
        groupName: group.name,
        invitedUserName: user.name,
        inviterName: invitedBy,
      });
      trackInviteFor(user.name);
    }
  }

  const xavier = getUserByName("Xavier");
  if (xavier) {
    const inviteKeySet = new Set(
      invites.map(
        (invite) =>
          `${invite.groupId}::${invite.invitedUserName.toLowerCase()}::${invite.inviterName.toLowerCase()}`
      )
    );
    for (const group of MOCK_GROUPS) {
      if (!canAddInviteFor(xavier.name)) break;
      const alreadyMember = (group.members || []).some(
        (member) => member.name.toLowerCase() === xavier.name.toLowerCase()
      );
      if (alreadyMember) continue;
      const inviterPool = (group.members || []).slice(0, 3);
      for (const inviter of inviterPool) {
        if (!canAddInviteFor(xavier.name)) break;
        const key = `${group.id}::${xavier.name.toLowerCase()}::${inviter.name.toLowerCase()}`;
        if (inviteKeySet.has(key)) continue;
        inviteKeySet.add(key);
        invites.push({
          id: `gi-mock-${String(invites.length + 1).padStart(3, "0")}`,
          groupId: group.id,
          groupName: group.name,
          invitedUserName: xavier.name,
          inviterName: inviter.name,
        });
        trackInviteFor(xavier.name);
      }
    }
  }

  return invites;
}

export function cloneMockFriendRequests() {
  const requests = [];
  if (MOCK_USERS.length < 2) return requests;
  const seen = new Set();
  const incomingPerTarget = new Map();
  const canAddIncomingFor = (userName) => (incomingPerTarget.get(userName.toLowerCase()) || 0) < 5;
  const trackIncomingFor = (userName) => {
    const key = userName.toLowerCase();
    incomingPerTarget.set(key, (incomingPerTarget.get(key) || 0) + 1);
  };
  for (let i = 0; i < MOCK_USERS.length; i += 1) {
    const requester = MOCK_USERS[i];
    const targets = [MOCK_USERS[(i + 1) % MOCK_USERS.length], MOCK_USERS[(i + 2) % MOCK_USERS.length]];
    for (const target of targets) {
      if (!target || target.name.toLowerCase() === requester.name.toLowerCase()) continue;
      if (!canAddIncomingFor(target.name)) continue;
      const key = `${requester.name.toLowerCase()}::${target.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      requests.push({
        id: `fr-mock-${String(requests.length + 1).padStart(3, "0")}`,
        requesterName: requester.name,
        requesterId: requester.userId,
        targetUserName: target.name,
        targetUserId: target.userId,
        status: "pending",
      });
      trackIncomingFor(target.name);
    }
  }

  const xavier = getUserByName("Xavier");
  if (xavier) {
    const requestKeySet = new Set(
      requests.map(
        (request) =>
          `${request.requesterName.toLowerCase()}::${request.targetUserName.toLowerCase()}`
      )
    );
    for (const requester of MOCK_USERS) {
      if (requester.name.toLowerCase() === xavier.name.toLowerCase()) continue;
      if (!canAddIncomingFor(xavier.name)) break;
      const incomingKey = `${requester.name.toLowerCase()}::${xavier.name.toLowerCase()}`;
      if (!requestKeySet.has(incomingKey)) {
        requestKeySet.add(incomingKey);
        requests.push({
          id: `fr-mock-${String(requests.length + 1).padStart(3, "0")}`,
          requesterName: requester.name,
          requesterId: requester.userId,
          targetUserName: xavier.name,
          targetUserId: xavier.userId,
          status: "pending",
        });
        trackIncomingFor(xavier.name);
      }
    }
  }

  return requests;
}

export function cloneMockFriendLinks() {
  const links = [];
  if (MOCK_USERS.length < 2) return links;
  for (let i = 0; i < MOCK_USERS.length; i += 1) {
    const user = MOCK_USERS[i];
    const friend = MOCK_USERS[(i + 3) % MOCK_USERS.length];
    if (!friend || friend.name.toLowerCase() === user.name.toLowerCase()) continue;
    links.push({
      userName: user.name,
      userId: user.userId,
      friendName: friend.name,
      friendId: friend.userId,
    });
    links.push({
      userName: friend.name,
      userId: friend.userId,
      friendName: user.name,
      friendId: user.userId,
    });
  }
  return links;
}

export function cloneMockFriendNotifications() {
  const notifications = [];
  for (const user of MOCK_USERS) {
    notifications.push({
      id: `fn-mock-${String(notifications.length + 1).padStart(3, "0")}`,
      userName: user.name,
      message: "Demo mode: your friends list is preloaded for showcase.",
      type: "demo-info",
    });
  }
  return notifications;
}
