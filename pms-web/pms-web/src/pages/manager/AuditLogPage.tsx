import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";

type Log={id:number;event:string;description:string;created_at:string;actor?:{name:string;role:string}};
export default function AuditLogPage(){
 const [logs,setLogs]=useState<Log[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{void (async()=>{try{const data:any=await apiRequest("/audit-logs");setLogs(data?.data??[]);}finally{setLoading(false);}})()},[]);
 return <DashboardLayout><div style={{padding:"2rem",maxWidth:1200,margin:"0 auto"}}><h1>Audit log</h1><p style={{color:"#64748b"}}>Permanent organization activity history. Every recorded action is attributable to an account.</p>{loading?<p>Loading…</p>:<div style={{display:"grid",gap:".65rem"}}>{logs.map(log=><article key={log.id} style={{padding:"1rem",border:"1px solid #e5e7eb",borderRadius:12}}><div style={{display:"flex",justifyContent:"space-between"}}><strong>{log.event}</strong><small>{new Date(log.created_at).toLocaleString()}</small></div><p>{log.description}</p><small>{log.actor?.name??"System"} · {log.actor?.role??"system"}</small></article>)}</div>}</div></DashboardLayout>;
}
