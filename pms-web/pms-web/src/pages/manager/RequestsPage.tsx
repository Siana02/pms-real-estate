import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, ArrowUpRight, CheckCircle2, ClipboardList, MessageSquareText, Plus, RefreshCw, Send, ShieldCheck } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";

type RequestItem = {
  id: number; type: string; title: string; description: string; priority: string; status: string;
  created_at: string; creator?: { name?: string; email?: string }; owner_reply?: string | null;
  replied_at?: string | null; replier?: { name?: string } | null; resolved_at?: string | null;
};
const styles = `
.support-requests{--rq-ink:#172b3f;--rq-muted:#5f6f82;--rq-line:#dfe7ef;max-width:1240px;margin:0 auto;padding:clamp(1rem,2.8vw,2rem);color:var(--rq-ink)}
.support-requests *{box-sizing:border-box}
.rq-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:clamp(1.2rem,3vw,2rem);border:1px solid var(--rq-line);border-radius:24px;background:linear-gradient(135deg,#f7faff 0%,#eef5fb 100%);margin-bottom:1.2rem}
.rq-eyebrow{display:inline-flex;align-items:center;gap:.45rem;font-size:.74rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#456b8d}
.rq-title{font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.12;letter-spacing:-.04em;margin:.65rem 0 .55rem;color:#162b40}
.rq-copy{max-width:48rem;font-size:.95rem;line-height:1.75;color:#52667a;margin:0}
.rq-layout{display:grid;grid-template-columns:minmax(280px,.78fr) minmax(0,1.22fr);gap:1rem;align-items:start}
.rq-card{background:#fff;border:1px solid var(--rq-line);border-radius:20px;box-shadow:0 10px 30px rgba(25,48,75,.055);overflow:hidden;min-width:0}
.rq-card__head{display:flex;align-items:center;gap:.7rem;padding:1.15rem 1.25rem;border-bottom:1px solid #edf1f5}
.rq-card__head h2{font-size:1.03rem;margin:0;color:#1c344b}
.rq-card__body{padding:1.2rem}
.rq-field{display:grid;gap:.42rem;margin-bottom:1rem}
.rq-label{font-size:.82rem;font-weight:750;color:#293f55}
.rq-input{width:100%;min-width:0;border:1px solid #cad6e2;border-radius:11px;background:#fff;color:#172b3f;padding:.78rem .85rem;font:inherit;font-size:.9rem;line-height:1.5}
.rq-input:focus{outline:3px solid #d9eaff;border-color:#3f75a5}
.rq-help{font-size:.77rem;line-height:1.5;color:#66788a}
.rq-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:42px;padding:.7rem 1rem;border:1px solid #d1dbe5;border-radius:11px;background:#fff;color:#29435a;font-weight:750;font-size:.85rem;cursor:pointer}
.rq-btn:disabled{opacity:.55;cursor:not-allowed}
.rq-btn--primary{background:#244f75;border-color:#244f75;color:#fff}
.rq-list{display:grid;gap:.85rem;padding:1rem}
.rq-item{border:1px solid #dfe7ef;border-radius:16px;padding:1rem;min-width:0}
.rq-item__top{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap}
.rq-item h3{font-size:1rem;line-height:1.4;margin:0 0 .4rem;overflow-wrap:anywhere}
.rq-meta{font-size:.76rem;line-height:1.6;color:#65778a}
.rq-description{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem;line-height:1.75;color:#30465b;margin:.8rem 0}
.rq-badge{display:inline-flex;align-items:center;gap:.35rem;border-radius:999px;padding:.35rem .6rem;font-size:.72rem;font-weight:800;text-transform:capitalize;background:#edf3f8;color:#38556e}
.rq-badge--urgent,.rq-badge--high{background:#fff0e8;color:#9a451f}
.rq-badge--resolved,.rq-badge--approved{background:#e8f7ee;color:#17633c}
.rq-reply{border:1px solid #b8d7c5;background:#f0faf4;border-radius:13px;padding:.9rem;margin-top:.9rem}
.rq-reply__label{display:flex;align-items:center;gap:.4rem;font-size:.75rem;font-weight:850;color:#226343}
.rq-reply p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem;line-height:1.7;color:#234936;margin:.55rem 0}
.rq-empty{padding:2rem 1rem;text-align:center;color:#6b7c8e}
.rq-alert{display:flex;gap:.65rem;align-items:flex-start;padding:.85rem 1rem;border-radius:12px;background:#fff4ee;border:1px solid #f1d0bf;color:#8b3d20;margin-bottom:1rem;font-size:.86rem;line-height:1.55}
.rq-alert--ok{background:#effaf3;border-color:#c6e7d1;color:#1e6941}
.rq-owner-tools{border-top:1px solid #e8edf2;margin-top:.9rem;padding-top:.9rem;display:grid;gap:.7rem}
@media(max-width:820px){.rq-layout{grid-template-columns:minmax(0,1fr)}.rq-hero{border-radius:18px}.rq-card{border-radius:16px}}
`;

export default function RequestsPage() {
  const [items,setItems]=useState<RequestItem[]>([]);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [type,setType]=useState("general");
  const [priority,setPriority]=useState("normal");
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [replies,setReplies]=useState<Record<number,string>>({});
  const [statuses,setStatuses]=useState<Record<number,string>>({});
  const [busyId,setBusyId]=useState<number|null>(null);
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem("user") ?? sessionStorage.getItem("user") ?? "{}") as {role?:string}; } catch { return {}; } }, []);
  const isOwner = ["admin","owner"].includes(String(user.role??"").toLowerCase());

  const load=useCallback(async()=>{setLoading(true);setError("");try{const data:any=await apiRequest("/requests");setItems(data?.data??[]);}catch(err){setError(err instanceof Error?err.message:"Could not load requests.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);

  async function submit(e:FormEvent){
    e.preventDefault();setSaving(true);setError("");setNotice("");
    try{await apiRequest("/requests",{method:"POST",body:JSON.stringify({type,title:title.trim(),description:description.trim(),priority})});setTitle("");setDescription("");setNotice("Request submitted. The organization owner can review it here.");await load();}
    catch(err){setError(err instanceof Error?err.message:"Could not send request.");}finally{setSaving(false);}
  }
  async function ownerAction(item:RequestItem){
    const reply=(replies[item.id]??"").trim();
    const status=statuses[item.id]??item.status;
    if(!reply && status===item.status){setError("Write a reply or change the request status before saving.");return;}
    setBusyId(item.id);setError("");setNotice("");
    try{const payload:Record<string,string>={};if(reply)payload.owner_reply=reply;if(status!==item.status)payload.status=status;await apiRequest(`/requests/${item.id}`,{method:"PATCH",body:JSON.stringify(payload)});setReplies(old=>({...old,[item.id]:""}));setNotice(`Request #${item.id} updated.`);await load();}
    catch(err){setError(err instanceof Error?err.message:"Could not update request.");}finally{setBusyId(null);}
  }

  return <DashboardLayout><div className="support-requests"><style>{styles}</style>
    <header className="rq-hero"><div><span className="rq-eyebrow"><ClipboardList size={16}/> Organization workflow</span><h1 className="rq-title">Requests & decisions</h1><p className="rq-copy">{isOwner?"Review what your team needs, reply directly to each request, and leave a clear decision trail.":"Send an action or approval request to your organization owner and follow the reply here."} Requests stay attached to the organization so the conversation and status are easy to find.</p></div><button className="rq-btn" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/> Refresh</button></header>
    {error&&<div className="rq-alert" role="alert"><AlertCircle size={18}/><span>{error}</span></div>}{notice&&<div className="rq-alert rq-alert--ok" role="status"><CheckCircle2 size={18}/><span>{notice}</span></div>}
    <div className="rq-layout">
      {!isOwner&&<section className="rq-card"><div className="rq-card__head"><Plus size={18}/><h2>Submit a request</h2></div><form className="rq-card__body" onSubmit={submit}>
        <label className="rq-field"><span className="rq-label">Request type</span><select className="rq-input" value={type} onChange={e=>setType(e.target.value)}><option value="general">General request</option><option value="lease_expiry">Lease ending / move-out</option><option value="deposit_refund">Deposit refund</option><option value="payment_correction">Payment correction</option></select></label>
        <label className="rq-field"><span className="rq-label">Priority</span><select className="rq-input" value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><span className="rq-help">Choose urgent only when a delay could cause immediate operational harm.</span></label>
        <label className="rq-field"><span className="rq-label">Short title</span><input className="rq-input" value={title} onChange={e=>setTitle(e.target.value)} maxLength={255} placeholder="e.g. Correct a rent allocation" required/></label>
        <label className="rq-field"><span className="rq-label">What needs attention?</span><textarea className="rq-input" value={description} onChange={e=>setDescription(e.target.value)} rows={5} maxLength={5000} placeholder="Explain what happened, the property/unit affected, and what action you need." required/></label>
        <button className="rq-btn rq-btn--primary" type="submit" disabled={saving}><Send size={16}/>{saving?"Submitting…":"Submit request"}</button>
      </form></section>}
      <section className="rq-card"><div className="rq-card__head"><MessageSquareText size={18}/><h2>{isOwner?"Team requests":"Your requests"}</h2><span className="rq-badge">{items.length} loaded</span></div>
        {loading?<div className="rq-empty">Loading requests…</div>:items.length===0?<div className="rq-empty"><ClipboardList size={28}/><p>No requests yet.</p><span className="rq-meta">{isOwner?"New team requests will appear here.":"Your submitted requests and owner replies will appear here."}</span></div>:<div className="rq-list">{items.map(item=><article className="rq-item" key={item.id}>
          <div className="rq-item__top"><div><h3>{item.title}</h3><div className="rq-meta">#{item.id} · {item.type.replaceAll("_"," ")} · Submitted by {item.creator?.name||"Team member"} · {new Date(item.created_at).toLocaleString()}</div></div><div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}><span className={`rq-badge rq-badge--${item.priority}`}>{item.priority}</span><span className={`rq-badge rq-badge--${item.status}`}>{item.status.replaceAll("_"," ")}</span></div></div>
          <p className="rq-description">{item.description}</p>
          {item.owner_reply&&<div className="rq-reply"><span className="rq-reply__label"><ShieldCheck size={15}/> Owner / administrator reply · {item.replier?.name||"Organization owner"} · {item.replied_at?new Date(item.replied_at).toLocaleString():""}</span><p>{item.owner_reply}</p></div>}
          {isOwner&&<div className="rq-owner-tools"><label className="rq-field"><span className="rq-label">Reply to this request</span><textarea className="rq-input" rows={3} value={replies[item.id]??""} onChange={e=>setReplies(old=>({...old,[item.id]:e.target.value}))} placeholder="Write the decision, next step, or what the requester should do…" maxLength={5000}/></label><div style={{display:"flex",gap:".7rem",alignItems:"end",flexWrap:"wrap"}}><label className="rq-field" style={{margin:0,minWidth:180,flex:"1 1 180px"}}><span className="rq-label">Status</span><select className="rq-input" value={statuses[item.id]??item.status} onChange={e=>setStatuses(old=>({...old,[item.id]:e.target.value}))}><option value="open">Open</option><option value="in_progress">In progress</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="resolved">Resolved</option></select></label><button className="rq-btn rq-btn--primary" type="button" disabled={busyId===item.id} onClick={()=>void ownerAction(item)}><ArrowUpRight size={16}/>{busyId===item.id?"Saving…":"Save reply / decision"}</button></div></div>}
        </article>)}</div>}
      </section>
    </div>
  </div></DashboardLayout>;
}
