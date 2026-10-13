import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LifeBuoy, MessageCircle, X } from "lucide-react";
import DeveloperSupportForm from "./DeveloperSupportForm";

const widgetStyles = `
.dsw-root { position:fixed; right:max(1rem,env(safe-area-inset-right)); bottom:max(1rem,env(safe-area-inset-bottom)); z-index:12000; font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
.dsw-root *, .dsw-root *::before, .dsw-root *::after { box-sizing:border-box; }
.dsw-trigger { display:flex; align-items:center; justify-content:center; gap:.55rem; border:0; border-radius:999px; background:#183b67; color:#fff; padding:.9rem 1.1rem; min-height:52px; box-shadow:0 10px 28px #0f274444; font:inherit; font-weight:800; cursor:pointer; }
.dsw-trigger:focus-visible,.dsw-close:focus-visible { outline:3px solid #93c5fd; outline-offset:3px; }
.dsw-panel { position:absolute; right:0; bottom:calc(100% + .75rem); width:min(440px,calc(100vw - 2rem)); max-height:min(78vh,760px); overflow:auto; border:1px solid #d9e1ec; border-radius:20px; background:#fff; box-shadow:0 24px 72px #10253d38; padding:1.2rem; color:#182235; }
.dsw-head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:1rem; }
.dsw-title { margin:0; color:#172b49; font-size:1.12rem; line-height:1.35; font-weight:850; }
.dsw-subtitle { margin:.35rem 0 0; color:#526177; font-size:.85rem; line-height:1.5; }
.dsw-close { display:grid; place-items:center; flex:0 0 auto; width:2.4rem; height:2.4rem; border:1px solid #d9e1ec; border-radius:10px; background:#f8fafc; color:#24364e; cursor:pointer; }
.dsw-links { display:flex; flex-wrap:wrap; gap:.6rem; padding-top:.9rem; margin-top:.9rem; border-top:1px solid #e6ebf2; }
.dsw-link { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; border:1px solid #cbd5e1; border-radius:10px; padding:.65rem .8rem; color:#1e3a5f; text-decoration:none; font-size:.86rem; font-weight:750; }
@media(max-width:480px) { .dsw-root { right:.7rem; bottom:.7rem; } .dsw-trigger { padding:.85rem 1rem; } .dsw-panel { right:0; width:calc(100vw - 1.4rem); max-height:78vh; padding:1rem; } }
`;

export default function SupportEntryPoint() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  let hasToken = false;
  try { hasToken = Boolean(localStorage.getItem("token") ?? sessionStorage.getItem("token")); } catch {}
  const isPortal = location.pathname.startsWith("/manager/") || location.pathname.startsWith("/tenant/") || location.pathname.startsWith("/platform-admin/");
  if (!hasToken || !isPortal) return null;

  return <div className="dsw-root">
    <style>{widgetStyles}</style>
    {open && <section className="dsw-panel" role="dialog" aria-modal="false" aria-labelledby="dsw-title">
      <div className="dsw-head">
        <div><h2 className="dsw-title" id="dsw-title">Need help from MARSWebz?</h2><p className="dsw-subtitle">Send a request straight from the portal. It is saved for review and routed to the development team.</p></div>
        <button className="dsw-close" type="button" onClick={() => setOpen(false)} aria-label="Close support panel"><X size={19} /></button>
      </div>
      <DeveloperSupportForm compact />
      <div className="dsw-links">
        <button className="dsw-link" type="button" onClick={() => { setOpen(false); navigate("/support"); }}><LifeBuoy size={16} /> Open full support page</button>
        <a className="dsw-link" href="https://wa.me/254101907239" target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp developers</a>
      </div>
    </section>}
    <button className="dsw-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close developer support" : "Open developer support"}>
      {open ? <X size={19} /> : <LifeBuoy size={20} />} {open ? "Close help" : "Need help?"}
    </button>
  </div>;
}
