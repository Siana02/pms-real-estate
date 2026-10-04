import { useMemo } from "react";

const styles = `
  .manager-dashboard {
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 2rem;
    background: #fffdf7;
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
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: clamp(1.15rem, 2vw, 1.5rem);
    font-weight: 650;
    letter-spacing: -0.025em;
    line-height: 1.3;
    color: #174a7c;
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
    font-size: 1rem;
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
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 750;
    letter-spacing: 0.08em;
    line-height: 1.15;
    color: #174a7c;
  }

  @media (prefers-reduced-motion: reduce) {
    .manager-dashboard__greeting-text {
      width: auto;
      border-right: 0;
      animation: none;
    }
  }
`;

export default function DashboardPage() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const greetingIcon = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "☀️";
    if (hour < 18) return "◐";
    return "☾";
  }, []);

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
      </main>
    </>
  );
}
