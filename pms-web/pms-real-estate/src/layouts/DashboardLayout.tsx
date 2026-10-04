import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, Menu, X } from "lucide-react";
import Sidebar from "../components/Sidebar";

const styles = `
.dl-root {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.dl-root,
.dl-root * {
  box-sizing: border-box;
}

.dl-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  height: 4rem;
  padding: 0 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  background: rgba(3,7,18,0.85);
  backdrop-filter: blur(18px);
}

.dl-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.dl-brand__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,0.1);
  background: linear-gradient(135deg, rgba(59,130,246,0.3), rgba(79,70,229,0.3));
  color: #bfdbfe;
}

.dl-brand__name {
  font-size: 1.0625rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.dl-brand__name span { color: #3b82f6; }

.dl-topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dl-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: #e2e8f0;
  cursor: pointer;
  transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}

.dl-iconbtn:hover {
  border-color: rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.1);
}

.dl-iconbtn svg { width: 1.125rem; height: 1.125rem; }

.dl-iconbtn--danger:hover {
  border-color: rgba(248,113,113,0.4);
  background: rgba(127,29,29,0.3);
  color: #fecaca;
}

.dl-rail {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: 17rem;
  border-right: 1px solid rgba(255,255,255,0.1);
  background: rgba(9,14,28,0.94);
  backdrop-filter: blur(22px);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.dl-rail--open { transform: translateX(0); }

.dl-rail__close {
  position: absolute;
  top: 0.875rem;
  right: 0.875rem;
  z-index: 1;
}

.dl-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(2,6,16,0.65);
  backdrop-filter: blur(2px);
}

.dl-main {
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
}

@media (min-width: 1024px) {
  .dl-topbar,
  .dl-overlay,
  .dl-rail__close { display: none; }

  .dl-rail {
    transform: translateX(0);
  }

  .dl-main {
    margin-left: 17rem;
    width: calc(100% - 17rem);
  }
}

@media (max-width: 1023px) {
  .dl-rail {
    width: min(17rem, 86vw);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dl-topbar *,
  .dl-rail *,
  .dl-overlay {
    animation-duration: 0.001ms;
    transition-duration: 0.001ms;
  }
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