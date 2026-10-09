import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PaymentDestinationSection from "../../components/PaymentDestinationSection";
import DarajaSettingsSection from "../../components/DarajaSettingsSection";
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
  padding: 0;
  border-radius: 50%;
  border: 1px dashed var(--pms-border);
  background: var(--pms-glass);
  overflow: hidden;
  cursor: pointer;
  position: relative;
}
 
.st-logo:hover { border-color: var(--pms-accent); }
.st-logo img { width: 100%; height: 100%; object-fit: contain; }
.st-logo:disabled { cursor: default; opacity: 0.7; }
 
.st-crop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(8px);
}
 
.st-crop__dialog {
  width: min(100%, 34rem);
  max-height: min(46rem, calc(100vh - 2rem));
  overflow: auto;
  border: 1px solid var(--pms-border);
  border-radius: 1.25rem;
  background: var(--pms-surface, #fff);
  box-shadow: 0 1.5rem 4rem rgba(15, 23, 42, 0.25);
}
 
.st-crop__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.125rem;
  border-bottom: 1px solid var(--pms-border-soft);
}
 
.st-crop__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--pms-heading);
}
 
.st-crop__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 50%;
  background: var(--pms-glass);
  color: var(--pms-muted);
  cursor: pointer;
}
 
.st-crop__close:hover { color: var(--pms-heading); }
 
.st-crop__body { padding: 1rem 1.125rem 1.125rem; }
 
.st-crop__stage {
  width: min(100%, 22rem);
  aspect-ratio: 1;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  background:
    linear-gradient(45deg, #eef1f3 25%, transparent 25%),
    linear-gradient(-45deg, #eef1f3 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eef1f3 75%),
    linear-gradient(-45deg, transparent 75%, #eef1f3 75%);
  background-size: 1.25rem 1.25rem;
  background-position: 0 0, 0 0.625rem, 0.625rem -0.625rem, -0.625rem 0;
  border: 1px solid var(--pms-border);
  touch-action: none;
  user-select: none;
}
 
.st-crop__image {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  pointer-events: none;
  user-select: none;
}
 
.st-crop__shade {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255,255,255,0.9);
  border-radius: 50%;
  box-shadow: inset 0 0 0 999px rgba(15, 23, 42, 0.04);
  pointer-events: none;
}
 
.st-crop__hint {
  margin: 0.75rem 0 0;
  text-align: center;
  font-size: 0.75rem;
  color: var(--pms-muted);
}
 
.st-crop__controls {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}
 
.st-crop__zoom {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.625rem;
}
 
.st-crop__zoom button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--pms-border);
  border-radius: 50%;
  background: transparent;
  color: var(--pms-heading);
  cursor: pointer;
}
 
.st-crop__zoom button:hover { background: var(--pms-glass); }
.st-crop__zoom input { width: 100%; accent-color: var(--pms-accent); }
 
.st-crop__zoomlabel {
  text-align: center;
  font-size: 0.75rem;
  color: var(--pms-muted);
}
 
.st-crop__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
 
.st-crop__preview-circle {
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--pms-border);
  background: #fff;
}
 
.st-crop__preview-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
 
.st-crop__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  margin-top: 1rem;
}
 
@media (max-width: 30rem) {
  .st-crop { padding: 0.5rem; }
  .st-crop__dialog { max-height: calc(100vh - 1rem); border-radius: 1rem; }
  .st-crop__body { padding: 0.875rem; }
}
 
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
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandName, setBrandName] = useState(profile.organization);
  const [tagline, setTagline] = useState("");
  const [brandEmail, setBrandEmail] = useState(profile.email);
  const [brandPhone, setBrandPhone] = useState("");
  const [brandAddress, setBrandAddress] = useState("");
  const [brandCity, setBrandCity] = useState("");
  const [brandCountry, setBrandCountry] = useState("Kenya");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropNaturalSize, setCropNaturalSize] = useState({ width: 0, height: 0 });
  const [cropStageSize, setCropStageSize] = useState(360);
  const [cropDragging, setCropDragging] = useState(false);
  const cropStageRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef({ x: 0, y: 0 });
 
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
          name?: string;
          tagline?: string | null;
          email?: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
        };

        setBrandName(organization.name ?? profile.organization);
        setTagline(organization.tagline ?? "");
        setBrandEmail(organization.email ?? profile.email);
        setBrandPhone(organization.phone ?? "");
        setBrandAddress(organization.address ?? "");
        setBrandCity(organization.city ?? "");
        setBrandCountry(organization.country ?? "Kenya");

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
 
  function closeCropper() {
    if (cropSource?.startsWith("blob:")) {
      URL.revokeObjectURL(cropSource);
    }
    setCropSource(null);
    setCropNaturalSize({ width: 0, height: 0 });
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropDragging(false);
  }

  function openCropper(source: string) {
    setError("");
    if (cropSource?.startsWith("blob:") && cropSource !== source) {
      URL.revokeObjectURL(cropSource);
    }
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropNaturalSize({ width: 0, height: 0 });
    setCropStageSize(cropStageRef.current?.clientWidth || 360);
    setCropSource(source);
  }

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

    const source = URL.createObjectURL(file);
    openCropper(source);
  }

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropNaturalSize.width) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      x: event.clientX - cropOffset.x,
      y: event.clientY - cropOffset.y,
    };
    setCropDragging(true);
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropDragging) return;
    setCropOffset({
      x: event.clientX - cropDragRef.current.x,
      y: event.clientY - cropDragRef.current.y,
    });
  }

  function handleCropPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setCropDragging(false);
  }

  function adjustZoom(delta: number) {
    setCropZoom((value) => Math.min(4, Math.max(1, Number((value + delta).toFixed(2)))));
  }

  async function saveCroppedLogo() {
    if (!cropSource || !cropNaturalSize.width || !cropStageRef.current) return;

    setError("");
    setSavingLogo(true);

    let fetchedSource: string | null = null;

    try {
      let sourceForCanvas = cropSource;

      if (cropSource.startsWith("http://") || cropSource.startsWith("https://")) {
        const sourceResponse = await fetch(cropSource, { mode: "cors" });
        if (!sourceResponse.ok) {
          throw new Error("Could not load the current logo for editing.");
        }
        const sourceBlob = await sourceResponse.blob();
        fetchedSource = URL.createObjectURL(sourceBlob);
        sourceForCanvas = fetchedSource;
      }

      const image = new Image();
      image.src = sourceForCanvas;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read that image."));
      });

      const stageSize = cropStageRef.current.clientWidth;
      const outputSize = 512;
      const baseScale = Math.min(
        stageSize / cropNaturalSize.width,
        stageSize / cropNaturalSize.height
      );
      const renderedWidth = cropNaturalSize.width * baseScale * cropZoom;
      const renderedHeight = cropNaturalSize.height * baseScale * cropZoom;
      const imageX = (stageSize - renderedWidth) / 2 + cropOffset.x;
      const imageY = (stageSize - renderedHeight) / 2 + cropOffset.y;

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the logo image.");

      context.clearRect(0, 0, outputSize, outputSize);
      context.drawImage(
        image,
        (imageX / stageSize) * outputSize,
        (imageY / stageSize) * outputSize,
        (renderedWidth / stageSize) * outputSize,
        (renderedHeight / stageSize) * outputSize
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) throw new Error("Could not create the cropped logo.");
      if (blob.size > MAX_LOGO_BYTES) {
        throw new Error("The adjusted logo is over 512 KB. Zoom out slightly and try again.");
      }

      const croppedFile = new File([blob], "organization-logo.png", {
        type: "image/png",
      });
      const form = new FormData();
      form.append("logo", croppedFile);

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
      window.dispatchEvent(new CustomEvent("pms:organization"));
      setNotice("Brand logo updated for your organization.");
      closeCropper();
      if (fetchedSource) URL.revokeObjectURL(fetchedSource);
    } catch (caught) {
      if (fetchedSource) URL.revokeObjectURL(fetchedSource);
      setError(caught instanceof Error ? caught.message : "Could not save the adjusted logo.");
    } finally {
      setSavingLogo(false);
    }
  }

  async function saveBrandProfile() {
    setSavingBrand(true);
    setError("");
    try {
      const response = await apiRequest("/organization/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: brandName.trim(),
          tagline: tagline.trim() || null,
          email: brandEmail.trim(),
          phone: brandPhone.trim() || null,
          address: brandAddress.trim() || null,
          city: brandCity.trim() || null,
          country: brandCountry.trim() || null,
        }),
      });
      if (response && typeof response === "object") {
        const organization = response as Record<string, unknown>;
        try {
          const existingRaw = localStorage.getItem("organization") ?? sessionStorage.getItem("organization");
          const existing = existingRaw ? JSON.parse(existingRaw) : {};
          const next = { ...existing, ...organization };
          localStorage.setItem("organization", JSON.stringify(next));
          sessionStorage.setItem("organization", JSON.stringify(next));
          window.dispatchEvent(new CustomEvent("pms:organization"));
        } catch {}
      }
      setNotice("Brand and contact details saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save brand details.");
    } finally {
      setSavingBrand(false);
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
              <h2 className="mg-panel__title"><ImageIcon /> Brand & contact details</h2>
              <span className="mg-panel__meta">Shown to tenants in Help & Support</span>
            </div>
            <div className="mg-panel__body">
              <div className="st-brand">
                <button type="button" className="st-logo" onClick={() => logo && openCropper(logo)} title={logo ? "Click to adjust the logo" : undefined} disabled={!logo || savingLogo}>
                  {logo ? <img src={logo} alt="Your brand logo" /> : <span className="st-logo__fallback">{initials(brandName)}</span>}
                </button>
                <div className="st-brandinfo">
                  <p className="mg-hint">This identity is used across the tenant experience. Add the name, tagline and contact details tenants should use when they need help.</p>
                  <div className="mg-actions" style={{ marginTop: "0.75rem" }}>
                    <input ref={fileInput} className="st-file" type="file" accept="image/*" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ""; }} />
                    <button type="button" className="mg-btn mg-btn--primary" onClick={() => fileInput.current?.click()} disabled={savingLogo}><Upload />{logo ? "Replace logo" : "Upload logo"}</button>
                    {logo && <button type="button" className="mg-btn mg-btn--ghost" onClick={() => void removeLogo()} disabled={savingLogo}><Trash2 />Remove</button>}
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"1rem",marginTop:"1.35rem"}}>
                <div><label className="mg-label" htmlFor="brand-name">Brand name</label><input id="brand-name" className="mg-input" value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="ABC Properties" /></div>
                <div><label className="mg-label" htmlFor="brand-tagline">Tagline</label><input id="brand-tagline" className="mg-input" value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="Your investment, our priority" /></div>
                <div><label className="mg-label" htmlFor="brand-email">Contact email</label><input id="brand-email" type="email" className="mg-input" value={brandEmail} onChange={e=>setBrandEmail(e.target.value)} placeholder="hello@abcproperties.com" /></div>
                <div><label className="mg-label" htmlFor="brand-phone">Contact phone</label><input id="brand-phone" className="mg-input" value={brandPhone} onChange={e=>setBrandPhone(e.target.value)} placeholder="+254 7xx xxx xxx" /></div>
                <div style={{gridColumn:"1 / -1"}}><label className="mg-label" htmlFor="brand-address">Office / support address</label><input id="brand-address" className="mg-input" value={brandAddress} onChange={e=>setBrandAddress(e.target.value)} placeholder="ABC House, Nairobi" /></div>
                <div><label className="mg-label" htmlFor="brand-city">City</label><input id="brand-city" className="mg-input" value={brandCity} onChange={e=>setBrandCity(e.target.value)} placeholder="Nairobi" /></div>
                <div><label className="mg-label" htmlFor="brand-country">Country</label><input id="brand-country" className="mg-input" value={brandCountry} onChange={e=>setBrandCountry(e.target.value)} placeholder="Kenya" /></div>
              </div>
              <div className="mg-actions" style={{marginTop:"1rem"}}>
                <button type="button" className="mg-btn mg-btn--primary" onClick={() => void saveBrandProfile()} disabled={savingBrand || !brandName.trim() || !brandEmail.trim()}><Check />{savingBrand ? "Saving…" : "Save brand details"}</button>
              </div>
            </div>
          </section>
 
          {cropSource && (
            <div
              className="st-crop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="brand-logo-crop-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !savingLogo) closeCropper();
              }}
            >
              <div className="st-crop__dialog">
                <div className="st-crop__head">
                  <h2 className="st-crop__title" id="brand-logo-crop-title">
                    Adjust brand logo
                  </h2>
                  <button
                    type="button"
                    className="st-crop__close"
                    onClick={closeCropper}
                    disabled={savingLogo}
                    aria-label="Close logo editor"
                  >
                    ×
                  </button>
                </div>

                <div className="st-crop__body">
                  <div
                    ref={cropStageRef}
                    className="st-crop__stage"
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                  >
                    <img
                      className="st-crop__image"
                      src={cropSource}
                      alt="Brand logo crop preview"
                      draggable={false}
                      onLoad={(event) => {
                        setCropNaturalSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        });
                        setCropStageSize(cropStageRef.current?.clientWidth || 360);
                      }}
                      style={
                        cropNaturalSize.width
                          ? {
                              width: cropNaturalSize.width,
                              height: cropNaturalSize.height,
                              transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${Math.min(
                                cropStageSize / cropNaturalSize.width,
                                cropStageSize / cropNaturalSize.height
                              ) * cropZoom})`,
                              transformOrigin: "center",
                            }
                          : undefined
                      }
                    />
                    <span className="st-crop__shade" aria-hidden="true" />
                  </div>

                  <p className="st-crop__hint">
                    Drag the logo to position it. Use the slider or +/− buttons to zoom.
                  </p>

                  <div className="st-crop__controls">
                    <div className="st-crop__zoom">
                      <button
                        type="button"
                        onClick={() => adjustZoom(-0.1)}
                        disabled={savingLogo || cropZoom <= 1}
                        aria-label="Zoom out"
                      >
                        <Minus />
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="0.05"
                        value={cropZoom}
                        onChange={(event) => setCropZoom(Number(event.target.value))}
                        disabled={savingLogo}
                        aria-label="Logo zoom"
                      />
                      <button
                        type="button"
                        onClick={() => adjustZoom(0.1)}
                        disabled={savingLogo || cropZoom >= 4}
                        aria-label="Zoom in"
                      >
                        <Plus />
                      </button>
                    </div>

                    <div className="st-crop__zoomlabel">
                      Zoom {Math.round(cropZoom * 100)}%
                    </div>

                    <div className="st-crop__preview">
                      <div className="st-crop__preview-circle">
                        {cropNaturalSize.width && (
                          <img
                            src={cropSource}
                            alt="Adjusted logo preview"
                            style={{
                              width: cropNaturalSize.width,
                              height: cropNaturalSize.height,
                              maxWidth: "none",
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: `translate(-50%, -50%) translate(${cropOffset.x * (56 / cropStageSize)}px, ${cropOffset.y * (56 / cropStageSize)}px) scale(${Math.min(
                                56 / cropNaturalSize.width,
                                56 / cropNaturalSize.height
                              ) * cropZoom})`,
                              transformOrigin: "center",
                            }}
                          />
                        )}
                      </div>
                      <span className="mg-hint">Portal preview</span>
                    </div>
                  </div>

                  <div className="st-crop__actions">
                    <button
                      type="button"
                      className="mg-btn mg-btn--ghost"
                      onClick={() => {
                        setCropZoom(1);
                        setCropOffset({ x: 0, y: 0 });
                      }}
                      disabled={savingLogo}
                    >
                      <RotateCcw />
                      Reset
                    </button>
                    <button
                      type="button"
                      className="mg-btn mg-btn--ghost"
                      onClick={closeCropper}
                      disabled={savingLogo}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="mg-btn mg-btn--primary"
                      onClick={() => void saveCroppedLogo()}
                      disabled={savingLogo || !cropNaturalSize.width}
                    >
                      <Check />
                      {savingLogo ? "Saving…" : "Use this logo"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

 
          {(profile.role === "admin" || profile.role === "owner") && (
            <section className="mg-panel">
              <div className="mg-panel__head">
                <h2 className="mg-panel__title">
                  <Users />
                  Team
                </h2>
              </div>
              <div className="mg-panel__body">
                <p className="mg-hint" style={{ margin: 0 }}>
                  Invite employees, assign operational roles, manage invitations,
                  and deactivate or reactivate staff without deleting their history.
                </p>
                <div className="mg-actions" style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="mg-btn mg-btn--primary"
                    onClick={() => window.location.assign("/manager/settings/team")}
                  >
                    <Users />
                    Manage team
                  </button>
                </div>
              </div>
            </section>
          )}

          <PaymentDestinationSection role={profile.role} />
          <DarajaSettingsSection />

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

        </div>
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerSettingsPage;
