import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Palette,
  Settings as SettingsIcon,
  Trash2,
  Upload,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import {
  applyTheme,
  readBrandLogo,
  readThemeId,
  saveBrandLogo,
  THEMES,
} from "../../styles/themes";
import type { Theme } from "../../styles/themes";
import { asString, initials, readCurrency, toRecord } from "../../services/format";
 
/* ------------------------------------------------------------------ */
/*  PAGE STYLES                                                        */
/* ------------------------------------------------------------------ */
 
const pageStyles = `
.st-themes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1rem;
}
 
.st-theme {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem;
  border-radius: var(--mg-radius-md);
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-glass);
  text-align: left;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
 
.st-theme:hover { transform: translateY(-2px); }
.st-theme--on { border-color: var(--pms-accent); }
 
.st-swatch {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 6.5rem;
  padding: 0.75rem;
  border-radius: var(--mg-radius-sm);
  border: 1px solid rgba(127, 127, 127, 0.22);
  overflow: hidden;
}
 
.st-swatch__bar {
  height: 0.5rem;
  border-radius: 999px;
}
 
.st-swatch__card {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 0.375rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
}
 
.st-dot { width: 1rem; height: 1rem; border-radius: 999px; }
 
.st-theme__name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--pms-heading);
}
 
.st-theme__desc {
  margin: 0.1875rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--pms-muted);
}
 
.st-theme__tick {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  background: var(--pms-accent);
  color: #fff;
}
 
.st-theme__tick svg { width: 0.875rem; height: 0.875rem; }
 
.st-brand {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
}
 
.st-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 6rem;
  height: 6rem;
  border-radius: var(--mg-radius-md);
  border: 1px dashed var(--pms-border);
  background: var(--pms-glass);
  overflow: hidden;
}
 
.st-logo img { width: 100%; height: 100%; object-fit: contain; }
 
.st-logo__fallback {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--pms-accent);
}
 
.st-brandinfo { flex: 1 1 16rem; min-width: 0; }
 
.st-file { display: none; }
 
.st-list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
 
.st-list__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--pms-border-soft);
  font-size: 0.875rem;
}
 
.st-list__row:last-child { border-bottom: none; padding-bottom: 0; }
.st-list__key { color: var(--pms-muted); }
.st-list__value { font-weight: 600; color: var(--pms-heading); overflow-wrap: anywhere; text-align: right; }
`;
 
/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
 
const MAX_LOGO_BYTES = 512 * 1024;
 
interface Profile {
  organization: string;
  email: string;
  user: string;
  role: string;
}
 
function readProfile(): Profile {
  function stored(key: string): Record<string, unknown> {
    try {
      const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
      return toRecord(raw ? JSON.parse(raw) : null);
    } catch {
      return {};
    }
  }
 
  const organization = stored("organization");
  const user = stored("user");
 
  return {
    organization: asString(organization.name) || "Your organization",
    email: asString(organization.email) || asString(user.email),
    user: asString(user.name) || "—",
    role: asString(user.role) || "property_manager",
  };
}
 
function ThemePreview({ theme }: { theme: Theme }) {
  const { tokens } = theme;
 
  return (
    <span className="st-swatch" style={{ background: tokens.bg }}>
      <span
        className="st-swatch__bar"
        style={{
          width: "70%",
          background: `linear-gradient(90deg, ${tokens.accent}, ${tokens.accent2})`,
        }}
      />
      <span
        className="st-swatch__card"
        style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}
      >
        <span className="st-dot" style={{ background: tokens.success }} />
        <span className="st-dot" style={{ background: tokens.warn }} />
        <span className="st-dot" style={{ background: tokens.danger }} />
        <span
          className="st-swatch__bar"
          style={{ flex: 1, background: tokens.glassStrong }}
        />
      </span>
    </span>
  );
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
 
function ManagerSettingsPage() {
  const profile = useMemo(readProfile, []);
  const currency = useMemo(readCurrency, []);
  const fileInput = useRef<HTMLInputElement>(null);
 
  const [themeId, setThemeId] = useState(() => readThemeId());
  const [logo, setLogo] = useState<string | null>(() => readBrandLogo());
  const [savingLogo, setSavingLogo] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
 
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganization() {
      try {
        const response = await apiRequest("/organization/profile");
        if (cancelled || !response || typeof response !== "object") return;

        const organization = response as {
          id?: number;
          logo_url?: string | null;
        };

        if (organization.logo_url !== undefined) {
          setLogo(organization.logo_url);
          saveBrandLogo(organization.logo_url);
        }

        try {
          const existingRaw =
            localStorage.getItem("organization") ??
            sessionStorage.getItem("organization");
          const existing = existingRaw ? JSON.parse(existingRaw) : {};
          const next = { ...existing, ...organization };

          localStorage.setItem("organization", JSON.stringify(next));
          sessionStorage.setItem("organization", JSON.stringify(next));
          window.dispatchEvent(new CustomEvent("pms:organization"));
        } catch {
          // The remote profile remains authoritative.
        }
      } catch {
        // Keep the cached logo if the profile endpoint is unavailable.
      }
    }

    void loadOrganization();

    return () => {
      cancelled = true;
    };
  }, []);
 
  useEffect(() => {
    if (!notice) return;
 
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);
 
  const selectTheme = useCallback((id: string) => {
    setThemeId(id);
    setError("");
    setNotice(`${applyTheme(id).name} applied across the portal.`);
  }, []);
 
  async function handleFile(file: File | undefined) {
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Use a PNG, JPG or SVG logo.");
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setError("Logos must be under 512 KB so they load instantly for everyone.");
      return;
    }

    setSavingLogo(true);

    try {
      const form = new FormData();
      form.append("logo", file);

      const response = await apiRequest("/organization/logo", {
        method: "POST",
        body: form,
      });

      const organization =
        response &&
        typeof response === "object" &&
        "organization" in response
          ? (response as { organization?: { logo_url?: string | null } }).organization
          : undefined;

      const nextLogo = organization?.logo_url ?? null;
      saveBrandLogo(nextLogo);
      setLogo(nextLogo);
      setNotice("Brand logo updated for your organization.");
      window.dispatchEvent(new CustomEvent("pms:organization"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload the logo.");
    } finally {
      setSavingLogo(false);
    }
  }

  async function removeLogo() {
    setError("");
    setSavingLogo(true);

    try {
      await apiRequest("/organization/logo", { method: "DELETE" });
      saveBrandLogo(null);
      setLogo(null);
      setNotice("Brand logo removed.");
      window.dispatchEvent(new CustomEvent("pms:organization"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the logo.");
    } finally {
      setSavingLogo(false);
    }
  }
 
  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{managerStyles}</style>
        <style>{pageStyles}</style>
 
        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <SettingsIcon />
                Workspace
              </span>
              <h1 className="mg-title">Settings</h1>
              <p className="mg-subtitle">
                Make the portal look like your company. Themes and the brand logo
                are saved for your organization. The logo is shared across the
                manager portal and tenant portal.
              </p>
            </div>
          </header>
 
          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          {notice && (
            <div className="mg-alert mg-alert--ok" role="status">
              <CheckCircle2 />
              <span>{notice}</span>
            </div>
          )}
 
          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <Palette />
                Theme
              </h2>
              <span className="mg-panel__meta">
                {THEMES.length} themes · currently{" "}
                {THEMES.find((theme) => theme.id === themeId)?.name}
              </span>
            </div>
 
            <div className="mg-panel__body">
              <div className="st-themes">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`st-theme${theme.id === themeId ? " st-theme--on" : ""}`}
                    onClick={() => selectTheme(theme.id)}
                    aria-pressed={theme.id === themeId}
                  >
                    <ThemePreview theme={theme} />
                    <span>
                      <p className="st-theme__name">{theme.name}</p>
                      <p className="st-theme__desc">{theme.description}</p>
                    </span>
                    {theme.id === themeId && (
                      <span className="st-theme__tick" aria-hidden="true">
                        <Check />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
 
          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <ImageIcon />
                Brand logo
              </h2>
            </div>
 
            <div className="mg-panel__body st-brand">
              <span className="st-logo">
                {logo ? (
                  <img src={logo} alt="Your brand logo" />
                ) : (
                  <span className="st-logo__fallback">
                    {initials(profile.organization)}
                  </span>
                )}
              </span>
 
              <div className="st-brandinfo">
                <p className="mg-hint">
                  PNG, JPG or SVG up to 512 KB. A square, transparent logo works
                  best next to the organization name.
                </p>
 
                <div className="mg-actions" style={{ marginTop: "0.75rem" }}>
                  <input
                    ref={fileInput}
                    className="st-file"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      handleFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="mg-btn mg-btn--primary"
                    onClick={() => fileInput.current?.click()}
                    disabled={savingLogo}
                  >
                    <Upload />
                    {logo ? "Replace logo" : "Upload logo"}
                  </button>
 
                  {logo && (
                    <button
                      type="button"
                      className="mg-btn mg-btn--ghost"
                      onClick={() => void removeLogo()}
                      disabled={savingLogo}
                    >
                      <Trash2 />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
 
          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <SettingsIcon />
                Organization
              </h2>
            </div>
 
            <div className="mg-panel__body">
              <ul className="st-list">
                <li className="st-list__row">
                  <span className="st-list__key">Organization</span>
                  <span className="st-list__value">{profile.organization}</span>
                </li>
                <li className="st-list__row">
                  <span className="st-list__key">Contact email</span>
                  <span className="st-list__value">{profile.email || "—"}</span>
                </li>
                <li className="st-list__row">
                  <span className="st-list__key">Currency</span>
                  <span className="st-list__value">{currency}</span>
                </li>
                <li className="st-list__row">
                  <span className="st-list__key">Signed in as</span>
                  <span className="st-list__value">{profile.user}</span>
                </li>
                <li className="st-list__row">
                  <span className="st-list__key">Role</span>
                  <span className="st-list__value">
                    {profile.role.replace(/_/g, " ")}
                  </span>
                </li>
              </ul>
 
              <p className="mg-hint" style={{ marginTop: "1rem" }}>
                Organization details, currency and roles come from the backend and
                are changed there — every request you make is already scoped to
                this organization.
              </p>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerSettingsPage;
