import { useEffect, useMemo, useState } from "react";
import HomePage from "./HomePage";
import GroupPage from "./GroupPage";
import GroupDetailPage from "./GroupDetailPage";
import AuthPage from "./AuthPage.jsx";
import AdminControlsModal from "./AdminControlsModal.jsx";
import { clearSession, getStoredSession, loginUser, registerUser } from "./authService.js";

function App() {
  const [adminTick, setAdminTick] = useState(0);
  const [page, setPage] = useState("home");
  const [homeNav, setHomeNav] = useState("Home");
  const [authMode, setAuthMode] = useState("login");
  const [session, setSession] = useState(() => getStoredSession());
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [highlightedName, setHighlightedName] = useState(() => session?.fullName ?? "");
  const [groupTabConfig, setGroupTabConfig] = useState({
    tabs: [
      { id: "groups", label: "My Groups" },
      { id: "create-group", label: "Create Group" },
    ],
    defaultTab: "groups",
  });
  const [groupPageOpts, setGroupPageOpts] = useState({ scrollToMyGroups: false });
  const [groupDetailId, setGroupDetailId] = useState("");

  const isAuthed = Boolean(session?.isAuthenticated);
  const isSystemAdmin = Boolean(session?.isSystemAdmin);

  useEffect(() => {
    if (!isSystemAdmin) {
      setAdminModalOpen(false);
    }
  }, [isSystemAdmin]);

  useEffect(() => {
    setHighlightedName(session?.fullName ?? "");
  }, [session?.fullName]);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!isAuthed || !accessToken) return;

    const headers = { Authorization: `Bearer ${accessToken}` };

    fetch("http://localhost:3000/api/v1/users/me", { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.user?.highlightedName) {
          setHighlightedName(payload.user.highlightedName);
        }
      })
      .catch(() => {});

    fetch("http://localhost:3000/api/v1/groups", { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (Array.isArray(payload?.groupTabs) && payload.groupTabs.length > 0) {
          setGroupTabConfig({
            tabs: payload.groupTabs,
            defaultTab: payload.defaultGroupTab ?? payload.groupTabs[0].id,
          });
        }
      })
      .catch(() => {});
  }, [isAuthed, session?.accessToken]);

  const protectedPage = useMemo(
    () => page === "group" || page === "group-detail",
    [page]
  );
  const authPageSelected = useMemo(() => page === "login" || page === "signup", [page]);

  // Direct auth routes from navbar buttons.
  if (authPageSelected) {
    return (
      <AuthPage
        mode={authMode}
        onModeChange={setAuthMode}
        onBack={() => {
          setPage("home");
        }}
        onSubmit={(authInput) => {
          return (async () => {
            const nextSession =
              authInput.mode === "signup" ? await registerUser(authInput) : await loginUser(authInput);
            setSession(nextSession);
            setPage("home");
          })();
        }}
      />
    );
  }

  // Route-guard behavior: unauthenticated users are redirected to auth first.
  if (!isAuthed && protectedPage) {
    return (
      <AuthPage
        mode={authMode}
        onModeChange={setAuthMode}
        onBack={() => {
          setPage("home");
        }}
        onSubmit={(authInput) => {
          return (async () => {
            const nextSession =
              authInput.mode === "signup" ? await registerUser(authInput) : await loginUser(authInput);
            setSession(nextSession);
            setPage("group");
          })();
        }}
      />
    );
  }

  if (page === "group") {
    return (
      <>
        {isSystemAdmin ? (
          <AdminControlsModal
            open={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            session={session}
            accessToken={session?.accessToken ?? ""}
            onAdminAction={() => setAdminTick((t) => t + 1)}
          />
        ) : null}
        <GroupPage
          highlightedName={highlightedName}
          accessToken={session?.accessToken ?? ""}
          groupTabConfig={groupTabConfig}
          isSystemAdmin={isSystemAdmin}
          onOpenAdmin={() => setAdminModalOpen(true)}
          adminTick={adminTick}
          scrollToMyGroupsOnMount={groupPageOpts.scrollToMyGroups}
          onNavigate={(next, meta) => {
            if (meta?.homeTab) {
              const tab = meta.homeTab === "Watchlist" && !isAuthed ? "Home" : meta.homeTab;
              setHomeNav(tab);
            }
            if (next === "group-detail") {
              setGroupDetailId(String(meta?.groupId ?? ""));
            }
            if (next === "group") {
              setGroupPageOpts({ scrollToMyGroups: Boolean(meta?.scrollToMyGroups) });
            }
            setPage(next);
          }}
          onLogout={() => {
            clearSession();
            setSession(null);
            setAuthMode("login");
            setHomeNav("Home");
            setPage("home");
          }}
        />
      </>
    );
  }

  if (page === "group-detail") {
    return (
      <>
        {isSystemAdmin ? (
          <AdminControlsModal
            open={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            session={session}
            accessToken={session?.accessToken ?? ""}
            onAdminAction={() => setAdminTick((t) => t + 1)}
          />
        ) : null}
        <GroupDetailPage
          groupId={groupDetailId}
          highlightedName={highlightedName}
          accessToken={session?.accessToken ?? ""}
          isSystemAdmin={isSystemAdmin}
          onOpenAdmin={() => setAdminModalOpen(true)}
          onBack={() => setPage("group")}
          onNavigate={(next, meta) => {
            if (meta?.homeTab) {
              const tab = meta.homeTab === "Watchlist" && !isAuthed ? "Home" : meta.homeTab;
              setHomeNav(tab);
            }
            if (next === "group") {
              setGroupPageOpts({ scrollToMyGroups: Boolean(meta?.scrollToMyGroups) });
            }
            setPage(next);
          }}
          onLogout={() => {
            clearSession();
            setSession(null);
            setAuthMode("login");
            setHomeNav("Home");
            setPage("home");
          }}
        />
      </>
    );
  }

  return (
    <>
      {isSystemAdmin ? (
        <AdminControlsModal
          open={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          session={session}
          accessToken={session?.accessToken ?? ""}
          onAdminAction={() => setAdminTick((t) => t + 1)}
        />
      ) : null}
      <HomePage
        highlightedName={highlightedName}
        accessToken={session?.accessToken ?? ""}
        adminTick={adminTick}
        isAuthenticated={isAuthed}
        isSystemAdmin={isSystemAdmin}
        onOpenAdmin={() => setAdminModalOpen(true)}
        homeNav={homeNav}
        onHomeNavChange={setHomeNav}
      onNavigate={(nextPage, meta) => {
        if (meta?.homeTab) {
          const tab = meta.homeTab === "Watchlist" && !isAuthed ? "Home" : meta.homeTab;
          setHomeNav(tab);
        }
        if (nextPage === "signup" || nextPage === "login") {
          setAuthMode(nextPage);
        }
        if (nextPage === "group-detail") {
          setGroupDetailId(String(meta?.groupId ?? ""));
        }
        if (nextPage === "group") {
          setGroupPageOpts({ scrollToMyGroups: Boolean(meta?.scrollToMyGroups) });
        }
        setPage(nextPage);
      }}
      onLogout={() => {
        clearSession();
        setSession(null);
        setAuthMode("login");
        setHomeNav("Home");
        setPage("home");
      }}
      />
    </>
  );
}

export default App;
