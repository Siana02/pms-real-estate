import { MessageCircle, ShieldCheck, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import DeveloperSupportForm from "../components/support/DeveloperSupportForm";

const pageStyles = `
.dsp-page { min-height:100vh; background:#f4f7fb; color:#172033; padding:clamp(1rem,3vw,2.5rem); font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
.dsp-page *, .dsp-page *::before, .dsp-page *::after { box-sizing:border-box; }
.dsp-shell { width:min(1100px,100%); margin:0 auto; }
.dsp-top { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.4rem; }
.dsp-eyebrow { margin:0 0 .4rem; color:#315f91; font-size:.75rem; font-weight:850; letter-spacing:.14em; text-transform:uppercase; }
.dsp-h1 { margin:0; color:#142744; font-size:clamp(1.8rem,4vw,2.8rem); line-height:1.15; letter-spacing:-.03em; }
.dsp-intro { max-width:680px; margin:.75rem 0 0; color:#526177; font-size:1rem; line-height:1.7; }
.dsp-card { border:1px solid #dbe3ee; border-radius:20px; background:#fff; padding:clamp(1rem,2.5vw,1.65rem); box-shadow:0 8px 28px #1a31540a; }
.dsp-grid { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr); gap:1.1rem; align-items:start; }
.dsp-card h2 { margin:0 0 .65rem; color:#182e4c; font-size:1.15rem; line-height:1.35; }
.dsp-info { display:grid; gap:.75rem; margin-top:1rem; }
.dsp-info-item { display:flex; gap:.75rem; align-items:flex-start; padding:.9rem; border:1px solid #e3e9f1; border-radius:13px; background:#fbfcfe; }
.dsp-info-item svg { flex:0 0 auto; color:#315f91; margin-top:.1rem; }
.dsp-info-item strong { display:block; margin-bottom:.2rem; color:#263b58; font-size:.9rem; }
.dsp-info-item p { margin:0; color:#526177; font-size:.84rem; line-height:1.6; }
.dsp-whatsapp { display:flex; justify-content:center; align-items:center; gap:.55rem; width:100%; min-height:48px; margin-top:1rem; padding:.8rem 1rem; border-radius:12px; background:#147d50; color:#fff; text-decoration:none; font-weight:800; }
.dsp-back { display:inline-flex; align-items:center; gap:.4rem; color:#315f91; font-size:.9rem; font-weight:750; text-decoration:none; }
@media(max-width:800px) { .dsp-grid { grid-template-columns:1fr; } }
`;

export default function DeveloperSupportPage() {
  return <main className="dsp-page">
    <style>{pageStyles}</style>
    <div className="dsp-shell">
      <header className="dsp-top">
        <div><p className="dsp-eyebrow">MARSWebz · Developer support</p><h1 className="dsp-h1">Let’s get this sorted.</h1><p className="dsp-intro">Report a missing M-Pesa confirmation, a reconciliation mismatch, a login issue, a service outage or anything technical that needs the development team’s attention.</p></div>
        <Link className="dsp-back" to="/">Back to home</Link>
      </header>
      <div className="dsp-grid">
        <section className="dsp-card" aria-labelledby="dsp-form-title"><h2 id="dsp-form-title">Submit a support request</h2><p className="dsp-intro" style={{ margin: "0 0 1.2rem", fontSize: ".9rem" }}>Your request is stored in the system and an email notification is sent to the developers. You do not need to email us yourself.</p><DeveloperSupportForm /></section>
        <aside className="dsp-card">
          <h2>What happens next?</h2>
          <div className="dsp-info">
            <div className="dsp-info-item"><ShieldCheck size={21}/><div><strong>Saved for review</strong><p>Your ticket is recorded in the database so it can be tracked even if the email service is temporarily unavailable.</p></div></div>
            <div className="dsp-info-item"><Wrench size={21}/><div><strong>Sent to the development team</strong><p>When outbound email is configured, the system sends the ticket details to the MARSWebz support inbox.</p></div></div>
            <div className="dsp-info-item"><MessageCircle size={21}/><div><strong>Response target: 30–60 minutes</strong><p>We aim to respond within 30–60 minutes. This is a target, not a guarantee, especially outside support hours or during a major outage.</p></div></div>
          </div>
          <a className="dsp-whatsapp" href="https://wa.me/254101907239" target="_blank" rel="noreferrer"><MessageCircle size={19}/> Contact developers on WhatsApp</a>
        </aside>
      </div>
    </div>
  </main>;
}
