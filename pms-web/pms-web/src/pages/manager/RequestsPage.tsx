import { FormEvent, useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";

type RequestItem = { id:number; type:string; title:string; description:string; priority:string; status:string; created_at:string; creator?:{name:string}; };

export default function RequestsPage() {
  const [items,setItems]=useState<RequestItem[]>([]);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [type,setType]=useState("general");
  const [priority,setPriority]=useState("normal");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function load(){ const data:any=await apiRequest("/requests"); setItems(data?.data ?? []); }
  useEffect(()=>{ void load(); },[]);

  async function submit(e:FormEvent){
    e.preventDefault(); setSaving(true); setError("");
    try { await apiRequest("/requests",{method:"POST",body:JSON.stringify({type,title,description,priority})}); setTitle(""); setDescription(""); await load(); }
    catch(err:any){ setError(err?.message ?? "Could not send request."); }
    finally{ setSaving(false); }
  }

  return <DashboardLayout>
    <div style={{padding:"2rem",maxWidth:1100,margin:"0 auto"}}>
      <h1>Requests</h1>
      <p style={{color:"#64748b"}}>Send the owner or administrator a request when an action needs approval or attention.</p>
      <form onSubmit={submit} style={{display:"grid",gap:"1rem",padding:"1.25rem",border:"1px solid #e5e7eb",borderRadius:16,margin:"1.5rem 0"}}>
        <select value={type} onChange={e=>setType(e.target.value)}><option value="general">General request</option><option value="lease_expiry">Lease ending / move-out</option><option value="deposit_refund">Deposit refund</option><option value="payment_correction">Payment correction</option></select>
        <select value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Request title" required />
        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Explain what needs attention..." rows={5} required />
        {error && <div style={{color:"#b42318"}}>{error}</div>}
        <button disabled={saving} type="submit">{saving ? "Sending…" : "Send request"}</button>
      </form>
      <div style={{display:"grid",gap:"0.75rem"}}>{items.map(item=><article key={item.id} style={{padding:"1rem",border:"1px solid #e5e7eb",borderRadius:14}}>
        <strong>{item.title}</strong><div style={{fontSize:13,color:"#64748b"}}>{item.type.replaceAll("_"," ")} · {item.priority} · {item.status}</div><p>{item.description}</p><small>{new Date(item.created_at).toLocaleString()}</small>
      </article>)}</div>
    </div>
  </DashboardLayout>;
}