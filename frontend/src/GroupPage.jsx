import { useEffect, useMemo, useState } from "react";
import {
  approveJoinRequest,
  createGroup,
  denyJoinRequest,
  getLeaderPendingJoinRequests,
  normalizeName,
  readGroups,
  requestJoinGroup,
  searchGroupsById,
} from "./groupDataStore.js";

export default function GroupPage({
  onNavigate,
  onLogout,
  highlightedName = "",
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

  useEffect(() => {
    setGroups(readGroups());
  }, [highlightedName]);

  useEffect(() => {
    if (!scrollToMyGroupsOnMount) return;
    const id = requestAnimationFrame(() => {
      document.getElementById("my-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [scrollToMyGroupsOnMount]);

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
        .gp-shell { min-height: 100vh; background: #0d0d0d; color: #f0ece4; font-family: 'DM Sans', sans-serif; }
        .nav { position: sticky; top: 0; z-index: 100; background: #111; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; height: 58px; }
        .nav-left { display: flex; align-items: center; gap: 10px; position: relative; }
        .notif-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #333; background: #171717; color: #ddd; cursor: pointer; position: relative; }
        .notif-badge { position: absolute; top: -6px; right: -6px; min-width: 16px; height: 16px; border-radius: 999px; background: #e74c3c; color: #fff; font-size: 10px; text-align: center; line-height: 16px; }
        .notif-panel { position: absolute; top: 40px; left: 0; width: min(420px, calc(100vw - 30px)); background: #121212; border: 1px solid #2a2a2a; border-radius: 10px; padding: 10px; z-index: 110; }
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
        .gp-wrap { max-width: 1000px; margin: 0 auto; padding: 24px 20px 60px; display: grid; gap: 20px; }
        .card { border: 1px solid #232323; border-radius: 12px; background: #121212; padding: 16px; }
        .title { margin: 0 0 10px; font-size: 20px; }
        .sub { color: #888; font-size: 13px; margin-bottom: 10px; }
        .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        input[type="text"] { flex: 1; min-width: 220px; background: #191919; border: 1px solid #2d2d2d; border-radius: 8px; color: #f0ece4; padding: 9px 11px; }
        .group-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid #252525; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
        .group-name { font-size: 15px; }
        .muted { color: #8f8f8f; font-size: 12px; }
        .empty { color: #666; font-size: 13px; padding: 4px 0; }
      `}</style>
      <div className="gp-shell">
        <nav className="nav">
          <div className="nav-left">
            <button className="notif-btn" type="button" onClick={() => setNotificationsOpen((v) => !v)}>
              🔔
              {pendingForLeader.length > 0 ? <span className="notif-badge">{pendingForLeader.length}</span> : null}
            </button>
            {notificationsOpen ? (
              <div className="notif-panel">
                {pendingForLeader.length === 0 ? (
                  <p className="empty">No pending join requests.</p>
                ) : (
                  pendingForLeader.map((req) => (
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

        <div className="gp-wrap">
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
            <div style={{ marginTop: 12 }}>
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
            <h2 className="title">My Groups</h2>
            {myGroups.length === 0 ? (
              <p className="empty">You are not in any groups yet.</p>
            ) : (
              myGroups.map((g) => (
                <div className="group-row" key={g.id}>
                  <div>
                    <div className="group-name">{g.name}</div>
                    <div className="muted">ID: {g.id}</div>
                  </div>
                  <button className="btn" type="button" onClick={() => openGroup(g.id)}>
                    Open Group
                  </button>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </>
  );
}
