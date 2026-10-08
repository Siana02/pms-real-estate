import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  KeyRound,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";

const styles = `
.ts-page{display:flex;flex-direction:column;gap:1rem;max-width:62rem;margin:0 auto}
.ts-intro{display:flex;align-items:center;gap:.9rem;padding:1.1rem 1.2rem;border:1px solid var(--tp-line);border-radius:var(--tp-r-lg);background:linear-gradient(135deg,#f8fbff,#fff)}
.ts-intro__icon{display:flex;align-items:center;justify-content:center;flex:none;width:2.65rem;height:2.65rem;border-radius:.8rem;background:var(--tp-blue-pale);color:var(--tp-blue)}
.ts-intro h2{margin:0;font-size:.98rem}.ts-intro p{margin:.28rem 0 0;color:var(--tp-muted);font-size:.78rem;line-height:1.5}
.ts-section{padding:1.1rem 1.15rem;border:1px solid var(--tp-line);border-radius:var(--tp-r-md);background:#fff;box-shadow:var(--tp-shadow-sm)}
.ts-section__head{display:flex;align-items:flex-start;gap:.7rem;margin-bottom:.85rem}.ts-section__icon{display:flex;align-items:center;justify-content:center;flex:none;width:2.15rem;height:2.15rem;border-radius:.65rem;background:var(--tp-surface-tint);color:var(--tp-blue)}.ts-section h3{margin:0;font-size:.88rem}.ts-section__head p{margin:.22rem 0 0;color:var(--tp-muted);font-size:.72rem;line-height:1.45}
.ts-list{display:flex;flex-direction:column;border-top:1px solid var(--tp-line-soft)}
.ts-row{display:flex;align-items:center;gap:.8rem;padding:.85rem .15rem;border-bottom:1px solid var(--tp-line-soft);text-decoration:none;color:inherit}.ts-row:last-child{border-bottom:0}.ts-row__icon{display:flex;align-items:center;justify-content:center;flex:none;width:2rem;height:2rem;border-radius:.55rem;background:var(--tp-surface-sunken);color:var(--tp-muted)}.ts-row__icon svg{width:1rem;height:1rem}.ts-row__copy{min-width:0;flex:1}.ts-row__title{display:block;font-size:.8rem;font-weight:700;color:var(--tp-ink)}.ts-row__sub{display:block;margin-top:.18rem;font-size:.7rem;line-height:1.4;color:var(--tp-muted)}.ts-row__end{display:flex;align-items:center;gap:.5rem;color:var(--tp-faint)}.ts-row__end svg{width:.95rem;height:.95rem}
.ts-badge{display:inline-flex;align-items:center;padding:.24rem .5rem;border-radius:999px;background:#ecfdf5;color:#15803d;font-size:.64rem;font-weight:750}
.ts-note{margin:.75rem 0 0;padding:.7rem .75rem;border-radius:.65rem;background:var(--tp-surface-sunken);color:var(--tp-muted);font-size:.69rem;line-height:1.5}
.ts-danger{border-color:#fee2e2}.ts-danger .ts-section__icon{background:#fef2f2;color:#dc2626}.ts-danger button{width:100%;display:flex;align-items:center;gap:.65rem;padding:.8rem .15rem;border:0;background:transparent;color:#b91c1c;text-align:left;cursor:pointer}.ts-danger button svg{width:1rem;height:1rem}.ts-danger button strong{font-size:.78rem}.ts-danger button span{display:block;margin-top:.15rem;color:#991b1b;font-size:.68rem}
@media(max-width:640px){.ts-intro{align-items:flex-start}.ts-row{padding:.85rem 0}.ts-row__end span{display:none}}
`;

function readUser(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem("user") ?? sessionStorage.getItem("user");
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

function TenantSettingsPage() {
  const navigate = useNavigate();
  const user = useMemo(readUser, []);
  const [signedOut, setSignedOut] = useState(false);

  const name = typeof user.name === "string" && user.name.trim() ? user.name : "Tenant";
  const email = typeof user.email === "string" ? user.email : "";
  const username = typeof user.username === "string" ? user.username : "";
  const accountStatus = typeof user.status === "string" ? user.status : "Active";

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setSignedOut(true);
    navigate("/login", { replace: true });
  }

  return (
    <TenantDashboardLayout
      title="Settings"
      subtitle="Manage how your tenant portal works for you."
    >
      <style>{styles}</style>
      <div className="ts-page">
        <section className="ts-intro">
          <span className="ts-intro__icon"><SlidersHorizontal size={19}/></span>
          <div>
            <h2>Your account control centre</h2>
            <p>Settings are for preferences, access and security. Your personal and tenancy information stays on your Profile page.</p>
          </div>
        </section>

        <section className="ts-section">
          <div className="ts-section__head">
            <span className="ts-section__icon"><UserRound size={16}/></span>
            <div>
              <h3>Account</h3>
              <p>Your sign-in identity and account status.</p>
            </div>
          </div>
          <div className="ts-list">
            <div className="ts-row">
              <span className="ts-row__icon"><ShieldCheck/></span>
              <div className="ts-row__copy">
                <span className="ts-row__title">{name}</span>
                <span className="ts-row__sub">{username ? `@${username} · ` : ""}{email || "Account email"} </span>
              </div>
              <span className="ts-badge">{accountStatus}</span>
            </div>
            <Link to="/tenant/profile" className="ts-row">
              <span className="ts-row__icon"><UserRound/></span>
              <div className="ts-row__copy">
                <span className="ts-row__title">Manage profile</span>
                <span className="ts-row__sub">Update your contact, identity and next-of-kin details on your Profile page.</span>
              </div>
              <span className="ts-row__end"><span>Open profile</span><ChevronRight/></span>
            </Link>
          </div>
        </section>

        <section className="ts-section">
          <div className="ts-section__head">
            <span className="ts-section__icon"><Bell size={16}/></span>
            <div>
              <h3>Notifications</h3>
              <p>Control how you receive property updates and reminders.</p>
            </div>
          </div>
          <div className="ts-list">
            <Link to="/tenant/notifications" className="ts-row">
              <span className="ts-row__icon"><Bell/></span>
              <div className="ts-row__copy">
                <span className="ts-row__title">Notification centre</span>
                <span className="ts-row__sub">Read maintenance, payment, lease and property announcements.</span>
              </div>
              <span className="ts-row__end"><span>View</span><ChevronRight/></span>
            </Link>
            <Link to="/tenant/notifications" className="ts-row">
              <span className="ts-row__icon"><ExternalLink/></span>
              <div className="ts-row__copy">
                <span className="ts-row__title">Device notifications</span>
                <span className="ts-row__sub">Enable browser alerts from the notification centre when supported by your device.</span>
              </div>
              <span className="ts-row__end"><span>Manage</span><ChevronRight/></span>
            </Link>
          </div>
        </section>

        <section className="ts-section">
          <div className="ts-section__head">
            <span className="ts-section__icon"><KeyRound size={16}/></span>
            <div>
              <h3>Security</h3>
              <p>Keep your account protected without duplicating the login setup flow.</p>
            </div>
          </div>
          <div className="ts-list">
            <Link to="/password-setup" className="ts-row">
              <span className="ts-row__icon"><KeyRound/></span>
              <div className="ts-row__copy">
                <span className="ts-row__title">Change password</span>
                <span className="ts-row__sub">Update the password you use to sign in to the tenant portal.</span>
              </div>
              <span className="ts-row__end"><span>Change</span><ChevronRight/></span>
            </Link>
          </div>
          <p className="ts-note">Your lease, property access and tenancy records are managed by your property team. Settings does not alter those records.</p>
        </section>

        <section className="ts-section">
          <div className="ts-section__head">
            <span className="ts-section__icon"><CircleHelp size={16}/></span>
            <div>
              <h3>Help & support</h3>
              <p>Need help with your home, payments or maintenance?</p>
            </div>
          </div>
          <div className="ts-list">
            <Link to="/tenant/help" className="ts-row">
              <span className="ts-row__icon"><CircleHelp/></span>
              <div className="ts-row__copy">
                <span className="ts-row__title">Contact property support</span>
                <span className="ts-row__sub">Find your property team's support contact details and raise a maintenance request.</span>
              </div>
              <span className="ts-row__end"><span>Get help</span><ChevronRight/></span>
            </Link>
          </div>
        </section>

        <section className="ts-section ts-danger">
          <div className="ts-section__head">
            <span className="ts-section__icon"><LogOut size={16}/></span>
            <div>
              <h3>Sign out</h3>
              <p>End this portal session on this device.</p>
            </div>
          </div>
          <button type="button" onClick={signOut} disabled={signedOut}>
            <LogOut/>
            <div><strong>{signedOut ? "Signing out…" : "Sign out of tenant portal"}</strong><span>You can sign back in at any time.</span></div>
          </button>
        </section>
      </div>
    </TenantDashboardLayout>
  );
}

export default TenantSettingsPage;
