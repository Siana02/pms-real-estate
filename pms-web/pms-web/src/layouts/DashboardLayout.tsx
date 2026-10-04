import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, Menu, X } from "lucide-react";
import Sidebar from "../components/Sidebar";

const styles = `
.dl-root {
  position: relative;
  min-height: 100vh;
  width: 100%;
}
.dl-root,
.dl-root * { box-sizing: border-box; }

.dl-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
  padding: 0 1rem;
  background: #ffffff;
  border-bottom: 1px solid #e1e4e7;
}
.dl-brand { display:flex; align-items:center; gap:.625rem; }
.dl-brand__mark { display:inline-flex; align-items:center; justify-content:center; width:2.25rem; height:2.25rem; border-radius:.75rem; background:#0a192f; color:#fff; }
.dl-brand__mark svg { width:1.125rem; height:1.125rem; }
.dl-brand__name { font-size:1.0625rem; font-weight:600; color:#18202a; white-space:nowrap; }
.dl-brand__name span { color:#315f8a; }
.dl-topbar__actions { display:flex; gap:.5rem; }
.dl-iconbtn { display:inline-flex; align-items:center; justify-content:center; width:2.5rem; height:2.5rem; border:1px solid #e1e5e8; border-radius:.75rem; background:#fff; color:#52606f; cursor:pointer; }
.dl-iconbtn svg { width:1.125rem; height:1.125rem; }

.dl-rail {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  width: 17rem;
  flex-direction: column;
  overflow-y: auto;
  background: #ffffff;
  border-right: 1px solid #e1e4e7;
  transform: translateX(-100%);
}
.dl-rail--open { transform: translateX(0); }
.dl-rail__close { position:absolute; top:.875rem; right:.875rem; }

.dl-overlay { position:fixed; inset:0; z-index:90; background:rgba(24,32,42,.3); }

.dl-main {
  min-height: 100vh;
  min-width: 0;
  overflow-x: hidden;
}

@media (min-width: 1024px) {
  .dl-topbar,
  .dl-overlay,
  .dl-rail__close { display:none; }
  .dl-rail { transform:translateX(0); }
  .dl-main { margin-left:17rem; width:calc(100% - 17rem); }
}

@media (max-width: 1023px) {
  .dl-rail { width:min(17rem,86vw); }
}
`;

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleSignOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("organization");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("organization");
    sessionStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="dl-root">
      <style>{styles}</style>

      <header className="dl-topbar">
        <div className="dl-brand">
          <span className="dl-brand__mark">
            <Building2 />
          </span>
          <span className="dl-brand__name">
            PMS<span>.</span>
          </span>
        </div>

        <div className="dl-topbar__actions">
          <button
            type="button"
            className="dl-iconbtn dl-iconbtn--danger"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <LogOut />
          </button>

          <button
            type="button"
            className="dl-iconbtn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="dl-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`dl-rail${mobileOpen ? " dl-rail--open" : ""}`}
        aria-label="Main navigation"
        onClick={() => setMobileOpen(false)}
      >
        <button
          type="button"
          className="dl-iconbtn dl-rail__close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>

        <Sidebar />
      </aside>

      <main className="dl-main">{children}</main>
    </div>
  );
}

export default DashboardLayout;