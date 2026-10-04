import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudSun, Moon, Plus, RefreshCw, Sun } from "lucide-react";

const styles = `
  @import url("https://fonts.googleapis.com/css2?family=Edu+QLD+Hand&family=Kulim+Park:wght@300;400;500;600;700&display=swap");

  .manager-dashboard {
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 2rem;
    background:
      radial-gradient(circle at 12% 10%, rgba(255, 255, 255, 0.9) 0%, transparent 34%),
      linear-gradient(135deg, #fffdf7 0%, #f4f8fc 48%, #eaf3fb 100%);
    color: #163b66;
  }

  .manager-dashboard__greeting {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: fit-content;
    margin: 0;
    padding: 0.2rem 0;
    text-align: left;
    font-family: "Kulim Park", sans-serif;
    font-size: clamp(1.15rem, 2vw, 1.5rem);
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.3;
    color: #2369a8;
  }

  .manager-dashboard__greeting-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    flex: 0 0 2rem;
    border-radius: 50%;
    background: #e8f2fc;
    color: #2369a8;
  }

  .manager-dashboard__greeting-icon svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 1.8;
  }

  .manager-dashboard__greeting-text {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    border-right: 2px solid #4b8bc4;
    width: 0;
    animation:
      manager-dashboard-type 1.4s steps(16, end) forwards,
      manager-dashboard-caret 0.75s step-end 4;
  }

  @keyframes manager-dashboard-type {
    from { width: 0; }
    to { width: 16ch; }
  }

  @keyframes manager-dashboard-caret {
    0%, 100% { border-color: transparent; }
    50% { border-color: #4b8bc4; }
  }

  .manager-dashboard__portfolio-title {
    display: block;
    width: 100%;
    margin: 3.25rem 0 0;
    text-align: center;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 700;
    letter-spacing: 0.07em;
    line-height: 1.15;
    color: #111111;
  }

  .manager-dashboard__organization {
    display: block;
    width: 100%;
    margin: 0.9rem 0 0;
    text-align: center;
    font-family: "Kulim Park", sans-serif;
    font-size: clamp(1.25rem, 2.6vw, 1.75rem);
    font-weight: 600;
    letter-spacing: 0.12em;
    line-height: 1.2;
    text-transform: uppercase;
    color: #8b929a;
  }

  .manager-dashboard__intro {
    display: block;
    width: 100%;
    margin: 1.15rem auto 0;
    overflow: hidden;
    white-space: nowrap;
    text-align: center;
    font-family: "Edu QLD Hand", cursive;
    font-size: clamp(1.15rem, 2.4vw, 1.5rem);
    font-weight: 400;
    line-height: 1.2;
    color: #42698e;
  }

  .manager-dashboard__intro-text {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    width: 0;
    border-right: 2px solid #6d9bc4;
    animation:
      manager-dashboard-intro-type 2.2s steps(27, end) 0.2s forwards,
      manager-dashboard-intro-caret 0.75s step-end 3.2s 3;
  }

  @keyframes manager-dashboard-intro-type {
    from { width: 0; }
    to { width: 27ch; }
  }

  @keyframes manager-dashboard-intro-caret {
    0%, 100% { border-color: transparent; }
    50% { border-color: #6d9bc4; }
  }

  .manager-dashboard__actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.9rem;
    margin: 1.4rem auto 0;
  }

  .manager-dashboard__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-width: 8.5rem;
    padding: 0.7rem 1.1rem;
    border: 1px solid #b8cee2;
    border-radius: 0.7rem;
    background: rgba(255, 255, 255, 0.72);
    color: #245b88;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 5px 14px rgba(55, 94, 125, 0.08);
    transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
  }

  .manager-dashboard__action:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 7px 18px rgba(55, 94, 125, 0.12);
  }

  .manager-dashboard__action:focus-visible {
    outline: 2px solid #4b8bc4;
    outline-offset: 2px;
  }

  .manager-dashboard__action svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 1.9;
  }

  @media (max-width: 520px) {
    .manager-dashboard__actions {
      flex-direction: column;
    }

    .manager-dashboard__action {
      width: min(100%, 12rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .manager-dashboard__greeting-text,
    .manager-dashboard__intro-text {
      width: auto;
      border-right: 0;
      animation: none;
    }
  }
`;

type Organization = {
  id?: number | string;
  name?: string;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const greetingIcon = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return <Sun aria-hidden="true" />;
    if (hour < 18) return <CloudSun aria-hidden="true" />;
    return <Moon aria-hidden="true" />;
  }, []);

  useEffect(() => {
    const storedOrganization =
      localStorage.getItem("organization") ??
      sessionStorage.getItem("organization");

    if (!storedOrganization) return;

    try {
      const parsed = JSON.parse(storedOrganization) as Organization;
      setOrganization(parsed);
    } catch {
      setOrganization(null);
    }
  }, []);

  const organizationName =
    organization?.name ??
    (organization?.id ? `Organization ${organization.id}` : "Organization");

  return (
    <>
      <style>{styles}</style>

      <main className="manager-dashboard">
        <div className="manager-dashboard__greeting">
          <span className="manager-dashboard__greeting-icon" aria-hidden="true">
            {greetingIcon}
          </span>
          <span className="manager-dashboard__greeting-text">{greeting}</span>
        </div>

        <h1 className="manager-dashboard__portfolio-title">
          PORTFOLIO OVERVIEW
        </h1>

        <div className="manager-dashboard__organization">
          {organizationName}
        </div>

        <div className="manager-dashboard__intro" aria-label="Manage your properties with ease">
          <span className="manager-dashboard__intro-text">
            Manage your properties with ease
          </span>
        </div>

        <div className="manager-dashboard__actions">
          <button
            type="button"
            className="manager-dashboard__action"
            onClick={() => window.location.reload()}
            aria-label="Refresh dashboard"
          >
            <RefreshCw aria-hidden="true" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="manager-dashboard__action"
            onClick={() => navigate("/manager/properties/add")}
            aria-label="Add property"
          >
            <Plus aria-hidden="true" />
            <span>Add Property</span>
          </button>
        </div>
      </main>
    </>
  );
}
