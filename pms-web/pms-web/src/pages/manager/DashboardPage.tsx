import { useMemo } from "react";

const styles = `
  .manager-dashboard {
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 2rem;
  }

  .manager-dashboard__greeting {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    text-align: left;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
    color: #18202a;
  }
`;

export default function DashboardPage() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <>
      <style>{styles}</style>

      <main className="manager-dashboard">
        <div className="manager-dashboard__greeting">{greeting}</div>
      </main>
    </>
  );
}
