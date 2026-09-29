import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";

import { ApiError, apiRequest } from "../services/api";

const styles = `
.pc-root {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #030712;
  color: #f8fafc;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter,
    Roboto, "Helvetica Neue", Arial, sans-serif;
  padding: 1.5rem;
}

.pc-card {
  width: 100%;
  max-width: 26rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  padding: 2rem;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.75);
}

.pc-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  margin-bottom: 1rem;
}

.pc-title {
  font-size: 1.375rem;
  font-weight: 700;
  margin: 0 0 0.375rem;
}

.pc-subtitle {
  color: #94a3b8;
  font-size: 0.9375rem;
  margin: 0 0 1.5rem;
}

.pc-field {
  margin-bottom: 1rem;
}

.pc-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 0.375rem;
}

.pc-input {
  width: 100%;
  padding: 0.75rem 0.875rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  font-size: 0.9375rem;
}

.pc-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
}

.pc-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 0.875rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.pc-alert--error {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.pc-alert--success {
  background: rgba(74, 222, 128, 0.12);
  color: #86efac;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.pc-alert svg {
  width: 1rem;
  height: 1rem;
  flex: none;
  margin-top: 0.125rem;
}

.pc-btn {
  width: 100%;
  padding: 0.8125rem 1rem;
  border-radius: 0.75rem;
  border: none;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
}

.pc-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
`;

function readStoredUser(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: Record<string, unknown>) {
  const json = JSON.stringify(user);
  if (localStorage.getItem("user")) localStorage.setItem("user", json);
  if (sessionStorage.getItem("user")) sessionStorage.setItem("user", json);
}

function homePathForRole(role: string): string {
  return role.trim().toLowerCase() === "tenant"
    ? "/tenant/dashboard"
    : "/manager/dashboard";
}

function ChangePasswordPage() {
  const navigate = useNavigate();
  const storedUser = readStoredUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const mustChangePassword = storedUser?.must_change_password === true;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!currentPassword) {
      setError(
        mustChangePassword
          ? "Enter the temporary password you were given."
          : "Enter your current password."
      );
      return;
    }

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const payload = await apiRequest("/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const record =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : {};
      const updatedUser = record.user;

      if (updatedUser && typeof updatedUser === "object") {
        writeStoredUser(updatedUser as Record<string, unknown>);
      } else if (storedUser) {
        writeStoredUser({ ...storedUser, must_change_password: false });
      }

      setSuccess(true);

      const role =
        (updatedUser && typeof updatedUser === "object"
          ? (updatedUser as Record<string, unknown>).role
          : storedUser?.role
        )
          ?.toString()
          .trim()
          .toLowerCase() ?? "";

      setTimeout(() => {
        navigate(homePathForRole(role), { replace: true });
      }, 1200);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not update your password. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pc-root">
      <style>{styles}</style>
      <div className="pc-card">
        <span className="pc-icon">
          <Lock size={20} />
        </span>
        <h1 className="pc-title">Set a permanent password</h1>
        <p className="pc-subtitle">
          {mustChangePassword
            ? "This is your first login. Enter the temporary password you were given, then choose a permanent password for your account."
            : "Enter your current password and choose a new one."}
        </p>

        {error ? (
          <div className="pc-alert pc-alert--error" role="alert">
            <AlertCircle />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="pc-alert pc-alert--success" role="status">
            <CheckCircle2 />
            <span>Password updated — taking you to your portal…</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="pc-field">
            <label className="pc-label" htmlFor="current_password">
              {mustChangePassword ? "Temporary password" : "Current password"}
            </label>
            <input
              id="current_password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              className="pc-input"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div className="pc-field">
            <label className="pc-label" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="pc-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="pc-field">
            <label className="pc-label" htmlFor="password_confirmation">
              Confirm new password
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              className="pc-input"
              value={passwordConfirmation}
              onChange={(event) =>
                setPasswordConfirmation(event.target.value)
              }
            />
          </div>

          <button type="submit" className="pc-btn" disabled={loading}>
            {loading ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default ChangePasswordPage;
