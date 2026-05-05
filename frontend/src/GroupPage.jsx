import { useEffect, useMemo, useState } from "react";
import {
  acceptInvite,
  acceptFriendRequest,
  demoFriendPresence,
  approveJoinRequest,
  createGroup,
  denyFriendRequest,
  denyJoinRequest,
  denyInvite,
  getLeaderPendingJoinRequests,
  normalizeName,
  readFriendLinks,
  readFriendNotifications,
  readFriendRequests,
  readGroups,
  readInvites,
  requestJoinGroup,
  searchGroupsById,
  writeFriendNotifications,
} from "./groupDataStore.js";

const MAX_NOTIFICATIONS_PER_SECTION = 5;

export default function GroupPage({
  onNavigate,
  onLogout,
  highlightedName = "",
  accessToken = "",
  isSystemAdmin = false,
  onOpenAdmin,
  scrollToMyGroupsOnMount = false,
}) {
  const currentUser = highlightedName?.trim() || "You";
  const currentUserId = normalizeName(currentUser);

  const [groups, setGroups] = useState(() => readGroups());
  const [groupName, setGroupName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [friendsRailOpen, setFriendsRailOpen] = useState(false);
  const [apiFriends, setApiFriends] = useState([]);
  const [groupInvites, setGroupInvites] = useState(() => readInvites());
  const [friendRequests, setFriendRequests] = useState(() => readFriendRequests());
  const [friendNotifications, setFriendNotifications] = useState(() => readFriendNotifications());

  const myGroups = useMemo(
    () =>
      groups.filter((g) =>
        (g.members || []).some((m) => normalizeName(m.name) === normalizeName(currentUser))
      ),
    [groups, currentUser]
  );
  const searchResults = useMemo(
    () => searchGroupsById(searchId, currentUser),
    [searchId, currentUser, groups]
  );
  const pendingForLeader = useMemo(
    () => getLeaderPendingJoinRequests(currentUser),
    [currentUser, groups, notificationsOpen]
  );
  const visibleInvites = useMemo(
    () =>
      groupInvites.filter(
        (invite) => normalizeName(invite.invitedUserName) === normalizeName(currentUser)
      ),
    [groupInvites, currentUser]
  );
  const visibleFriendRequests = useMemo(
    () =>
      friendRequests.filter((req) => normalizeName(req.targetUserName) === normalizeName(currentUser)),
    [friendRequests, currentUser]
  );
  const visibleFriendNotifications = useMemo(
    () =>
      friendNotifications.filter((note) => normalizeName(note.userName) === normalizeName(currentUser)),
    [friendNotifications, currentUser]
  );
  const displayedJoinRequests = useMemo(
    () => pendingForLeader.slice(0, MAX_NOTIFICATIONS_PER_SECTION),
    [pendingForLeader]
  );
  const displayedInvites = useMemo(
    () => visibleInvites.slice(0, MAX_NOTIFICATIONS_PER_SECTION),
    [visibleInvites]
  );
  const displayedFriendRequests = useMemo(
    () => visibleFriendRequests.slice(0, MAX_NOTIFICATIONS_PER_SECTION),
    [visibleFriendRequests]
  );
  const displayedFriendNotifications = useMemo(
    () => visibleFriendNotifications.slice(0, MAX_NOTIFICATIONS_PER_SECTION),
    [visibleFriendNotifications]
  );
  const notificationBadgeCount = notificationsOpen
    ? 0
    : displayedJoinRequests.length +
      displayedInvites.length +
      displayedFriendRequests.length +
      displayedFriendNotifications.length;
  const railFriendsList = useMemo(() => {
    const self = normalizeName(currentUser || "");
    const fromApi = (apiFriends || []).map((f) => ({
      userId: String(f.userId || ""),
      displayName: f.displayName,
      isOnline: Boolean(f.isOnline),
      activityStatus: String(f.activityStatus || "active").toLowerCase(),
    }));
    const apiNames = new Set(fromApi.map((f) => normalizeName(f.displayName)));
    const fromLocal = self
      ? readFriendLinks()
          .filter((l) => normalizeName(l.userName) === self)
          .filter((l) => !apiNames.has(normalizeName(l.friendName || "")))
          .map((l) => {
            const presence = demoFriendPresence(l.friendName);
            return {
              userId: String(l.friendId || ""),
              displayName: l.friendName,
              isOnline: presence.isOnline,
              activityStatus: presence.activityStatus,
            };
          })
      : [];
    return [...fromApi, ...fromLocal].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [apiFriends, currentUser, friendRequests]);
  const railOnlineCount = useMemo(
    () => railFriendsList.filter((f) => f.isOnline).length,
    [railFriendsList]
  );

  useEffect(() => {
    setGroups(readGroups());
    setGroupInvites(readInvites());
    setFriendRequests(readFriendRequests());
    setFriendNotifications(readFriendNotifications());
  }, [highlightedName]);

  useEffect(() => {
    if (!scrollToMyGroupsOnMount) return;
    const id = requestAnimationFrame(() => {
      document.getElementById("my-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [scrollToMyGroupsOnMount]);

  useEffect(() => {
    if (!accessToken) {
      setApiFriends([]);
      return;
    }
    const loadFriends = () => {
      fetch("http://localhost:3000/api/v1/users/friends", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (Array.isArray(payload?.friends)) setApiFriends(payload.friends);
          else setApiFriends([]);
        })
        .catch(() => setApiFriends([]));
    };
    loadFriends();
    const id = setInterval(loadFriends, 12000);
    return () => clearInterval(id);
  }, [accessToken, friendsRailOpen]);

  useEffect(() => {
    if (!accessToken) return;
    const ping = () => {
      fetch("http://localhost:3000/api/v1/users/me/presence", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 25000);
    return () => clearInterval(id);
  }, [accessToken]);

  const navItems = [
    "Home",
    "My Groups",
    "Watchlist",
    ...(isSystemAdmin ? ["Admin"] : []),
    "Logout",
  ];

  const handleCreate = () => {
    const created = createGroup({
      name: groupName,
      leaderName: currentUser,
      leaderUserId: currentUserId,
      isPrivate,
    });
    if (!created) return;
    setGroups(readGroups());
    setGroupName("");
    setIsPrivate(false);
  };

  const handleJoin = (groupId) => {
    const result = requestJoinGroup(groupId, currentUser, currentUserId);
    if (result.status === "joined") {
      setJoinMsg("Joined group.");
    } else if (result.status === "requested") {
      setJoinMsg("Join request sent to group leader.");
    } else if (result.status === "pending") {
      setJoinMsg("Join request already pending.");
    } else if (result.status === "already-member") {
      setJoinMsg("You are already in this group.");
    } else {
      setJoinMsg("Could not join group.");
    }
    setGroups(readGroups());
  };

  const openGroup = (groupId) => onNavigate("group-detail", { groupId });

  const handleApprove = (requestId) => {
    approveJoinRequest(requestId);
    setGroups(readGroups());
  };

  const handleDeny = (requestId) => {
    denyJoinRequest(requestId);
    setGroups(readGroups());
  };

  const handleJoinInvite = (inviteId) => {
    acceptInvite(inviteId, currentUser);
    setGroupInvites(readInvites());
    setGroups(readGroups());
  };

  const handleDenyInvite = (inviteId) => {
    denyInvite(inviteId);
    setGroupInvites(readInvites());
  };

  const handleAcceptFriendRequest = (requestId) => {
    acceptFriendRequest(requestId);
    setFriendRequests(readFriendRequests());
    setFriendNotifications(readFriendNotifications());
  };

  const handleDenyFriendRequest = (requestId) => {
    denyFriendRequest(requestId);
    setFriendRequests(readFriendRequests());
  };

  const dismissFriendNotification = (notificationId) => {
    const next = friendNotifications.filter((note) => note.id !== notificationId);
    writeFriendNotifications(next);
    setFriendNotifications(next);
  };

  const handleNavClick = (item) => {
    if (item === "Home") onNavigate("home", { homeTab: "Home" });
    else if (item === "My Groups" || item === "Groups") {
      document.getElementById("my-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (item === "Watchlist") onNavigate("home", { homeTab: "Watchlist" });
    else if (item === "Logout") onLogout();
    else if (item === "Admin") onOpenAdmin?.();
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #0d0d0d; }
        .gp-shell { min-height: 100vh; background: #0d0d0d; color: #f0ece4; font-family: 'DM Sans', sans-serif; }
        .nav { position: sticky; top: 0; z-index: 100; background: #111; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; height: 58px; }
        .nav-left { display: flex; align-items: center; gap: 10px; position: relative; }
        .notif-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #333; background: #171717; color: #ddd; cursor: pointer; position: relative; }
        .notif-badge { position: absolute; top: -6px; right: -6px; min-width: 16px; height: 16px; border-radius: 999px; background: #e74c3c; color: #fff; font-size: 10px; text-align: center; line-height: 16px; }
        .notif-panel { position: absolute; top: 40px; left: 0; width: min(420px, calc(100vw - 30px)); max-height: min(75vh, 560px); overflow-y: auto; background: #121212; border: 1px solid #2a2a2a; border-radius: 10px; padding: 10px; z-index: 110; }
        .notif-title { font-size: 12px; color: #8f8f8f; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .notif-item { border: 1px solid #252525; border-radius: 8px; padding: 10px; margin-bottom: 8px; background: #101010; }
        .notif-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
        .notif-actions { display: flex; gap: 6px; }
        .btn { border: 1px solid #3a3a3a; background: transparent; color: #ddd; border-radius: 7px; padding: 6px 10px; cursor: pointer; }
        .btn:hover { border-color: #e8c547; color: #e8c547; }
        .btn-danger { border-color: #6a2e2e; color: #ff9d9d; }
        .nav-links { display: flex; gap: 8px; }
        .nav-link { background: none; border: none; color: #999; cursor: pointer; padding: 8px 12px; border-radius: 6px; }
        .nav-link:hover { color: #f0ece4; background: #1a1a1a; }
        .nav-link.active { color: #e8c547; background: rgba(232,197,71,0.08); }
        .brand { color: #e8c547; font-weight: 700; letter-spacing: 1px; }
        .gp-wrap { max-width: 1060px; margin: 0 auto; padding: 30px 20px 72px; display: grid; gap: 22px; transition: padding-right 0.28s ease; }
        .gp-wrap.has-friends-rail { padding-right: 70px; }
        .gp-wrap.has-friends-rail.rail-open { padding-right: min(350px, calc(100vw - 20px)); }
        .card {
          border: 1px solid #272727;
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(22,22,22,0.95) 0%, rgba(16,16,16,0.95) 100%);
          padding: 18px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.22);
        }
        .title { margin: 0 0 8px; font-size: 21px; letter-spacing: 0.2px; }
        .sub { color: #8d8d8d; font-size: 13px; margin-bottom: 12px; line-height: 1.45; }
        .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        input[type="text"] {
          flex: 1;
          min-width: 220px;
          background: #191919;
          border: 1px solid #2f2f2f;
          border-radius: 9px;
          color: #f0ece4;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        input[type="text"]:focus {
          border-color: #e8c547;
          box-shadow: 0 0 0 2px rgba(232,197,71,0.15);
        }
        .group-list {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }
        .group-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid #2b2b2b;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 0;
          background: #151515;
          transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
        }
        .group-row:hover {
          border-color: #3a3a3a;
          background: #181818;
          transform: translateY(-1px);
        }
        .group-name { font-size: 15px; font-weight: 600; }
        .muted { color: #8f8f8f; font-size: 12px; }
        .empty { color: #666; font-size: 13px; padding: 4px 0; }
        .my-groups-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .my-groups-count {
          font-size: 12px;
          color: #7f7f7f;
          border: 1px solid #2e2e2e;
          border-radius: 999px;
          padding: 4px 8px;
          background: #161616;
          white-space: nowrap;
        }
        .public-group-warning {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(232, 160, 71, 0.4);
          background: rgba(90, 48, 22, 0.35);
          color: #e8d4b0;
          font-size: 13px;
          line-height: 1.5;
          max-width: 720px;
        }
        .public-group-warning strong { color: #f0d090; font-weight: 600; }
        .friends-rail {
          position: fixed;
          top: 58px;
          right: 0;
          bottom: 0;
          z-index: 110;
          display: flex;
          flex-direction: row-reverse;
          pointer-events: none;
        }
        .friends-rail > * { pointer-events: auto; }
        .friends-rail-handle {
          position: relative;
          z-index: 2;
          width: 50px;
          flex-shrink: 0;
          border: none;
          border-left: 1px solid #2a2a2a;
          background: linear-gradient(180deg, #1c1c1c 0%, #141414 100%);
          color: #e8c547;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 10px 3px;
          box-shadow: -6px 0 18px rgba(0,0,0,0.35);
        }
        .friends-rail-handle-badge {
          position: absolute;
          top: -2px;
          right: -6px;
          min-width: 15px;
          height: 15px;
          padding: 0 3px;
          border-radius: 999px;
          background: #2a2a2a;
          color: #888;
          font-size: 8px;
          font-weight: 700;
          line-height: 15px;
          text-align: center;
          border: 1px solid #3a3a3a;
        }
        .friends-rail-handle-badge.lit {
          background: #153524;
          color: #8ef0b0;
          border-color: #2ecc71;
        }
        .friends-rail-handle-icon-wrap {
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e8c547;
        }
        .friends-rail-handle-svg {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }
        .friends-rail-handle-active-line {
          font-size: 9px;
          font-weight: 600;
          color: #666;
          letter-spacing: 0.02em;
        }
        .friends-rail-handle-active-line.on {
          color: #6ee7a8;
        }
        .friends-rail-panel {
          width: min(280px, calc(100vw - 50px));
          background: #121212;
          border-left: 1px solid #2a2a2a;
          box-shadow: -12px 0 32px rgba(0,0,0,0.45);
          transform: translateX(100%);
          transition: transform 0.28s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          pointer-events: none;
          z-index: 0;
        }
        .friends-rail.open .friends-rail-panel {
          transform: translateX(0);
          pointer-events: auto;
        }
        .friends-rail-head { padding: 14px 16px 10px; border-bottom: 1px solid #232323; }
        .friends-rail-title { font-size: 15px; font-weight: 600; color: #f0ece4; }
        .friends-rail-sub { font-size: 11px; color: #6ee7a8; font-weight: 500; }
        .friends-rail-sub.muted { color: #666; }
        .friends-rail-list {
          overflow-y: auto;
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .friends-rail-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #161616;
          border: 1px solid #252525;
          border-radius: 10px;
        }
        .friends-rail-online { width: 8px; height: 8px; border-radius: 50%; background: #4a4a4a; flex-shrink: 0; }
        .friends-rail-online.on { background: #2ecc71; box-shadow: 0 0 8px rgba(46, 204, 113, 0.45); }
        .friends-rail-online.away { background: #f1c40f; box-shadow: 0 0 8px rgba(241, 196, 15, 0.4); }
        .friends-rail-online.busy { background: #e74c3c; box-shadow: 0 0 8px rgba(231, 76, 60, 0.4); }
        .friends-rail-online.invisible { background: #4a4a4a; box-shadow: none; }
        .avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #1e1e1e; border: 1px solid #2e2e2e;
          display: flex; align-items: center; justify-content: center;
          color: #c5c5c5; font-size: 13px; font-weight: 600;
          flex-shrink: 0;
        }
        .friends-rail-name { font-size: 14px; color: #f0ece4; font-weight: 500; }
      `}</style>
      <div className="gp-shell">
        <nav className="nav">
          <div className="nav-left">
            <button className="notif-btn" type="button" onClick={() => setNotificationsOpen((v) => !v)}>
              🔔
              {notificationBadgeCount > 0 ? (
                <span className="notif-badge">
                  {notificationBadgeCount}
                </span>
              ) : null}
            </button>
            {notificationsOpen ? (
              <div className="notif-panel">
                <p className="notif-title">Group Join Requests</p>
                {pendingForLeader.length === 0 ? <p className="empty">No pending join requests.</p> : (
                  displayedJoinRequests.map((req) => (
                    <div className="notif-item" key={req.id}>
                      <div className="notif-row">
                        <div>
                          <div>{req.requesterName} requested to join</div>
                          <div className="muted">{req.groupName}</div>
                        </div>
                        <div className="notif-actions">
                          <button className="btn" type="button" onClick={() => handleApprove(req.id)}>Approve</button>
                          <button className="btn btn-danger" type="button" onClick={() => handleDeny(req.id)}>Deny</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <p className="notif-title" style={{ marginTop: 12 }}>Group Invites</p>
                {visibleInvites.length === 0 ? (
                  <p className="empty">No pending invites for you.</p>
                ) : (
                  displayedInvites.map((invite) => (
                    <div className="notif-item" key={invite.id}>
                      <div className="notif-row">
                        <div>
                          <div>You are invited to join</div>
                          <div className="muted">{invite.groupName} · by {invite.inviterName}</div>
                        </div>
                        <div className="notif-actions">
                          <button className="btn" type="button" onClick={() => handleJoinInvite(invite.id)}>Join</button>
                          <button className="btn btn-danger" type="button" onClick={() => handleDenyInvite(invite.id)}>Deny</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <p className="notif-title" style={{ marginTop: 12 }}>Friend Requests</p>
                {visibleFriendRequests.length === 0 ? (
                  <p className="empty">No friend requests.</p>
                ) : (
                  displayedFriendRequests.map((req) => (
                    <div className="notif-item" key={req.id}>
                      <div className="notif-row">
                        <div>
                          <div>{req.requesterName} sent you a friend request</div>
                          <div className="muted">Requester ID: {req.requesterId}</div>
                        </div>
                        <div className="notif-actions">
                          <button className="btn" type="button" onClick={() => handleAcceptFriendRequest(req.id)}>Accept</button>
                          <button className="btn btn-danger" type="button" onClick={() => handleDenyFriendRequest(req.id)}>Deny</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <p className="notif-title" style={{ marginTop: 12 }}>Friend Alerts</p>
                {visibleFriendNotifications.length === 0 ? (
                  <p className="empty">No friend alerts.</p>
                ) : (
                  displayedFriendNotifications.map((note) => (
                    <div className="notif-item" key={note.id}>
                      <div className="notif-row">
                        <div>{note.message}</div>
                        <div className="notif-actions">
                          <button className="btn btn-danger" type="button" onClick={() => dismissFriendNotification(note.id)}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
            <div className="brand">MOVIENIGHT</div>
          </div>
          <div className="nav-links">
            {navItems.map((item) => (
              <button
                key={item}
                className={`nav-link ${item === "My Groups" ? "active" : ""}`}
                type="button"
                onClick={() => handleNavClick(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </nav>

        <div className={`gp-wrap has-friends-rail${friendsRailOpen ? " rail-open" : ""}`}>
          <section className="card">
            <h2 className="title">Create Group</h2>
            <p className="sub">Create public groups (instant join) or private groups (leader approval).</p>
            <div className="row">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <label className="muted">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Private group
              </label>
              <button className="btn" type="button" onClick={handleCreate}>Create</button>
            </div>
            {!isPrivate ? (
              <p className="public-group-warning" role="status">
                <strong>Public group:</strong> any member can invite people by name, and anyone who learns this
                group&apos;s ID can join from the My Groups page without your approval. Turn on{" "}
                <strong>Private group</strong> if only you (the leader) should send invites and approve new members.
              </p>
            ) : null}
          </section>

          <section className="card">
            <h2 className="title">Search and Join by Group ID</h2>
            <p className="sub">Search by full/partial ID. Public groups join immediately; private groups send a request.</p>
            <div className="row">
              <input
                type="text"
                placeholder="Enter group ID (example: G-...)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
            {joinMsg ? <p className="sub" style={{ color: "#9fd4ff", marginTop: 8 }}>{joinMsg}</p> : null}
            <div className="group-list">
              {searchResults.length === 0 ? (
                <p className="empty">No groups found.</p>
              ) : (
                searchResults.map((g) => (
                  <div className="group-row" key={g.id}>
                    <div>
                      <div className="group-name">{g.name}</div>
                      <div className="muted">
                        ID: {g.id} • {g.isPrivate ? "Private" : "Public"} • {g.members?.length || 0} members
                      </div>
                    </div>
                    <button className="btn" type="button" disabled={g.isMember} onClick={() => handleJoin(g.id)}>
                      {g.isMember ? "Joined" : g.isPrivate ? "Request to Join" : "Join"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card" id="my-groups">
            <div className="my-groups-head">
              <h2 className="title">My Groups</h2>
              <span className="my-groups-count">{myGroups.length} total</span>
            </div>
            {myGroups.length === 0 ? (
              <p className="empty">You are not in any groups yet.</p>
            ) : (
              <div className="group-list">
                {myGroups.map((g) => (
                  <div className="group-row" key={g.id}>
                    <div>
                      <div className="group-name">{g.name}</div>
                      <div className="muted">ID: {g.id} • {g.isPrivate ? "Private" : "Public"}</div>
                    </div>
                    <button className="btn" type="button" onClick={() => openGroup(g.id)}>
                      Open Group
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <div className={`friends-rail${friendsRailOpen ? " open" : ""}`} aria-label="My friends">
          <button
            type="button"
            className="friends-rail-handle"
            onClick={() => setFriendsRailOpen((o) => !o)}
            aria-expanded={friendsRailOpen}
            aria-label={`Friends, ${railOnlineCount} active`}
          >
            <span className="friends-rail-handle-icon-wrap" aria-hidden>
              <svg
                className="friends-rail-handle-svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3.5" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className={`friends-rail-handle-badge${railOnlineCount > 0 ? " lit" : ""}`}>
                {railOnlineCount > 99 ? "99+" : railOnlineCount}
              </span>
            </span>
            <span>Friends</span>
            <span
              className={`friends-rail-handle-active-line${railOnlineCount > 0 ? " on" : ""}`}
              aria-hidden
            >
              {railOnlineCount} active
            </span>
            <span>{friendsRailOpen ? "◀" : "▶"}</span>
          </button>
          <aside className="friends-rail-panel">
            <div className="friends-rail-head">
              <div className="friends-rail-title">Your friends</div>
              <div className={`friends-rail-sub${railOnlineCount > 0 ? "" : " muted"}`}>
                {railOnlineCount} of {railFriendsList.length} active
              </div>
            </div>
            <div className="friends-rail-list">
              {railFriendsList.length === 0 ? (
                <p className="empty">No friends yet.</p>
              ) : (
                railFriendsList.map((f) => (
                  <div key={`${f.userId}-${f.displayName}`} className="friends-rail-row">
                    <span
                      className={`friends-rail-online${
                        f.isOnline ? (f.activityStatus === "away" ? " away" : f.activityStatus === "busy" ? " busy" : " on") : ""
                      }${!f.isOnline || f.activityStatus === "invisible" ? " invisible" : ""}`}
                      title={f.isOnline ? f.activityStatus : "offline"}
                    />
                    <div className="avatar">{f.displayName.charAt(0).toUpperCase()}</div>
                    <span className="friends-rail-name">{f.displayName}</span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
