import { useState } from "react";
import { apiRequest } from "./api";
import { Field } from "./components/BookingForm";
import { Icon } from "./components/Icon";
import { Logo } from "./PublicSite";
export default function AuthPage({
  staff = false,
  onAuthenticated,
  user = null,
  forceChange = false,
}) {
  const query = new URLSearchParams(location.search);
  const initial = forceChange
    ? "change"
    : location.pathname === "/reset-password" || query.has("reset")
      ? "reset"
      : location.pathname === "/forgot-password"
        ? "forgot"
        : query.get("create") === "1"
          ? "register"
          : "login";
  const [mode, setMode] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "forgot") {
        const result = await apiRequest("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: f.email }),
        });
        setNotice(
          result.message ||
            "If this account exists, password reset instructions will be sent to its email address.",
        );
      } else if (mode === "reset") {
        if (f.password !== f.confirm)
          throw new Error("The passwords do not match.");
        await apiRequest("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            token: query.get("token") || query.get("reset"),
            newPassword: f.password,
          }),
        });
        setMode("login");
        setNotice("Your password has been reset. You can now sign in.");
        history.replaceState({}, "", staff ? "/staff" : "/account");
      } else if (mode === "change") {
        if (f.newPassword !== f.confirm)
          throw new Error("The passwords do not match.");
        await apiRequest("/auth/password", {
          method: "POST",
          body: JSON.stringify(f),
        });
        const session = await apiRequest("/auth/session");
        onAuthenticated(session);
      } else {
        const session = await apiRequest(
          mode === "register" ? "/auth/register" : "/auth/login",
          { method: "POST", body: JSON.stringify(f) },
        );
        onAuthenticated(session);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const title = {
    login: staff ? "Welcome back, team." : "Your home. Your care.",
    register: "Make yourself at home.",
    forgot: "Let’s get you back in.",
    reset: "A fresh start.",
    change: "Make this account yours.",
  }[mode];
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Logo light />
        <div className="auth-story-copy">
          <p className="eyebrow">Wellness home care · Kigali</p>
          <h1>
            More peace
            <br />
            of mind.
            <br />
            <em>Every day.</em>
          </h1>
          <p>
            {staff
              ? "A calmer place to coordinate care, look after families and keep the day moving."
              : "Your visits, your care team and the little updates that mean a lot. All in one place."}
          </p>
          <div className="auth-story-rule" />
          <span>
            <Icon name="shield" />
            Private accounts. Thoughtful support.
          </span>
        </div>
        <p className="auth-photo-credit">
          Home assistance, coordinated around you.
        </p>
      </div>
      <main className="auth-main">
        <a className="back-link" href="/">
          Back to Wellness
        </a>
        <div className="auth-form-wrap">
          <span className="auth-icon">
            <Icon name={staff ? "briefcase" : "home"} size={28} />
          </span>
          <p className="eyebrow">
            {forceChange
              ? "First sign-in"
              : staff
                ? "Team workspace"
                : "Family account"}
          </p>
          <h2>{title}</h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Sign in to keep everything connected."
              : mode === "register"
                ? "Create a private account to manage your household and services."
                : mode === "forgot"
                  ? "Enter the email address linked to your account."
                  : mode === "change"
                    ? "Replace your temporary password before continuing."
                    : "Choose a strong password you haven’t used elsewhere."}
          </p>
          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice notice-success" role="status">
              {notice}
            </p>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <Field label="Full name">
                  <input
                    name="fullName"
                    autoComplete="name"
                    required
                    minLength="2"
                    maxLength="120"
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    name="phone"
                    autoComplete="tel"
                    type="tel"
                    required
                    minLength="7"
                    maxLength="24"
                  />
                </Field>
              </>
            )}
            {!["change", "reset"].includes(mode) && (
              <Field label="Email address">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength="254"
                  placeholder="you@example.com"
                />
              </Field>
            )}
            {mode === "change" && (
              <Field label="Temporary / current password">
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field
                label={
                  mode === "change" || mode === "reset"
                    ? "New password"
                    : "Password"
                }
                hint={mode !== "login" ? "At least 12 characters." : ""}
              >
                <div className="password-input">
                  <input
                    name={mode === "change" ? "newPassword" : "password"}
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "login" ? 1 : 12}
                    maxLength="128"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>
            )}
            {["change", "reset"].includes(mode) && (
              <Field label="Confirm new password">
                <input
                  name="confirm"
                  type="password"
                  required
                  minLength="12"
                  maxLength="128"
                  autoComplete="new-password"
                />
              </Field>
            )}
            {mode === "register" && (
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>
                  I have read the <a href="/policies/privacy">privacy notice</a>{" "}
                  and <a href="/policies/terms">service terms</a>.
                </span>
              </label>
            )}
            {mode === "login" && (
              <div className="auth-forgot">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button
              className="button button-primary auth-submit"
              disabled={busy}
            >
              {busy
                ? "Please wait…"
                : {
                    login: "Sign in",
                    register: "Create my account",
                    forgot: "Send reset instructions",
                    reset: "Reset password",
                    change: "Save password and continue",
                  }[mode]}
            </button>
          </form>
          {!forceChange && (
            <div className="auth-switch">
              {mode === "login" ? (
                <>
                  {staff ? "Joining our care team?" : "New to Wellness?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (staff) location.href = "/become-provider";
                      else {
                        setMode("register");
                        setError("");
                      }
                    }}
                  >
                    {staff ? "Apply as a provider" : "Create an account"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setNotice("");
                  }}
                >
                  Back to sign in
                </button>
              )}
            </div>
          )}
          <p className="auth-help">
            Need help? <a href="/contact">Contact our team</a>
          </p>
        </div>
        <p className="auth-footer">
          © {new Date().getFullYear()} Wellness Home Care
        </p>
      </main>
    </div>
  );
}
