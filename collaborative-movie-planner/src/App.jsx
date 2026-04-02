import { useEffect, useMemo, useState } from "react";
import HomePage from "./HomePage";
import GroupPage from "./GroupPage";
import AuthPage from "./AuthPage.jsx";
import AdminControlsModal from "./AdminControlsModal.jsx";
import { clearSession, getStoredSession, loginUser, registerUser } from "./authService.js";

function App() {
  const [page, setPage] = useState("home");
  const [homeNav, setHomeNav] = useState("Home");
  const [authMode, setAuthMode] = useState("login");
  const [session, setSession] = useState(() => getStoredSession());
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const isAuthed = Boolean(session?.isAuthenticated);
  const isSystemAdmin = Boolean(session?.isSystemAdmin);

  useEffect(() => {
    if (!isSystemAdmin) {
      setAdminModalOpen(false);
    }
  }, [isSystemAdmin]);

  const protectedPage = useMemo(() => page === "group", [page]);
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
          const nextSession =
            authInput.mode === "signup" ? registerUser(authInput) : loginUser(authInput);
          setSession(nextSession);
          setPage("home");
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
          const nextSession =
            authInput.mode === "signup" ? registerUser(authInput) : loginUser(authInput);
          setSession(nextSession);
          setPage("group");
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
          />
        ) : null}
        <GroupPage
          isSystemAdmin={isSystemAdmin}
          onOpenAdmin={() => setAdminModalOpen(true)}
          onNavigate={(next, meta) => {
            if (meta?.homeTab) {
              setHomeNav(meta.homeTab);
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
        />
      ) : null}
      <HomePage
        isAuthenticated={isAuthed}
        isSystemAdmin={isSystemAdmin}
        onOpenAdmin={() => setAdminModalOpen(true)}
        homeNav={homeNav}
        onHomeNavChange={setHomeNav}
      onNavigate={(nextPage, meta) => {
        if (meta?.homeTab) {
          setHomeNav(meta.homeTab);
        }
        if (nextPage === "signup" || nextPage === "login") {
          setAuthMode(nextPage);
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
