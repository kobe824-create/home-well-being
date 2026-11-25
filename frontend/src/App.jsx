import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import PublicSite from "./PublicSite";
import AuthPage from "./AuthPage";
import Portal from "./Portal";
import ContentEditor from "./components/ContentEditor";
import { SiteContentProvider } from "./site-context";

function Application() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const path = location.pathname;
  const accountRoute = [
    "/account",
    "/staff",
    "/admin",
    "/workspace",
    "/forgot-password",
    "/reset-password",
  ].includes(path);
  useEffect(() => {
    let active = true;
    apiRequest("/auth/session")
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setUser(null);
      setError("");
      location.assign("/account");
    } catch (e) {
      setError(e.message);
    }
  }
  if (accountRoute && loading)
    return (
      <div className="app-loading" role="status">
        <span className="loading-orbit" />
        <strong>Making room for your day…</strong>
      </div>
    );
  if (
    accountRoute &&
    user &&
    !path.includes("password") &&
    !new URLSearchParams(location.search).has("reset")
  ) {
    if (user.mustChangePassword)
      return <AuthPage user={user} forceChange onAuthenticated={setUser} />;
    return (
      <>
        {error && (
          <div className="global-alert" role="alert">
            {error}
          </div>
        )}
        <Portal
          user={user}
          onLogout={logout}
          onUserChange={setUser}
          contentEditor={<ContentEditor />}
        />
      </>
    );
  }
  if (accountRoute)
    return (
      <AuthPage
        staff={path === "/staff" || path === "/admin"}
        onAuthenticated={(u) => {
          setUser(u);
          if (path.includes("password")) location.assign("/account");
        }}
      />
    );
  return <PublicSite user={user} />;
}

export default function App() { return <SiteContentProvider><Application /></SiteContentProvider>; }
