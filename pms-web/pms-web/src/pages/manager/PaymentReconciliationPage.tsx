import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, RefreshCw, Search, WalletCards, X, XCircle } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import { formatDate, formatMoney, readCurrency, rows, asNumber, asString, toRecord, namedRef } from "../../services/format";

type ReconciliationStatus = "pending" | "reconciled" | "reconciled_with_credit" | "needs_review" | "unmatched";
interface Allocation { id:number; amount:number; rentObligation:{id:number; period:string; due_date:string; amount_due:number}|null }
interface Transaction {
 id:number; provider:string; external_transaction_id:string; amount:number; currency:string; payer_phone:string|null;
 payment_reference:string|null; transaction_at:string; status:ReconciliationStatus; reconciliation_note:string|null;
 matchedLease:{id:number; tenant:{id:number;name:string}|null; property:{id:number;name:string}|null; unit:{id:number;unit_number:string}|null}|null;
 matchedRentObligation:{id:number;period:string;due_date:string;amount_due:number;balance:number;status:string}|null;
 payment:{id:number; amount:number; allocations:Allocation[]}|null;
}
interface Lease { id:number; label:string }

const STATUS: {id:ReconciliationStatus|"all";label:string}[]=[
 {id:"all",label:"All"}, {id:"needs_review",label:"Needs review"}, {id:"unmatched",label:"Unmatched"},
 {id:"reconciled",label:"Reconciled"}, {id:"reconciled_with_credit",label:"Credit"}, {id:"pending",label:"Pending"}
];

function parse(payload:unknown):Transaction[]{
 return rows(toRecord(payload).data ?? payload).map(r=>{
  const lease=toRecord(r.matchedLease), tenant=toRecord(lease.tenant), property=toRecord(lease.property), unit=toRecord(lease.unit);
  const obligation=toRecord(r.matchedRentObligation), payment=toRecord(r.payment);
  return {
   id:asNumber(r.id), provider:asString(r.provider)||"unknown", external_transaction_id:asString(r.external_transaction_id),
   amount:asNumber(r.amount), currency:asString(r.currency)||"KES", payer_phone:asString(r.payer_phone)||null,
   payment_reference:asString(r.payment_reference)||null, transaction_at:asString(r.transaction_at),
   status:(STATUS.some(s=>s.id===r.status)?asString(r.status):"pending") as ReconciliationStatus,
   reconciliation_note:asString(r.reconciliation_note)||null,
   matchedLease:lease.id?{id:asNumber(lease.id),tenant:tenant.id?{id:asNumber(tenant.id),name:asString(tenant.name)}:null,property:property.id?{id:asNumber(property.id),name:asString(property.name)}:null,unit:unit.id?{id:asNumber(unit.id),unit_number:asString(unit.unit_number)}:null}:null,
   matchedRentObligation:obligation.id?{id:asNumber(obligation.id),period:asString(obligation.period),due_date:asString(obligation.due_date),amount_due:asNumber(obligation.amount_due),balance:asNumber(obligation.balance),status:asString(obligation.status)}:null,
   payment:payment.id?{id:asNumber(payment.id),amount:asNumber(payment.amount),allocations:rows(payment.allocations).map(a=>{const o=toRecord(a.rentObligation);return{id:asNumber(a.id),amount:asNumber(a.amount),rentObligation:o.id?{id:asNumber(o.id),period:asString(o.period),due_date:asString(o.due_date),amount_due:asNumber(o.amount_due)}:null}})}:null
  };
 });
}
function statusLabel(s:ReconciliationStatus){return s==="needs_review"?"Needs review":s==="unmatched"?"Unmatched":s==="reconciled_with_credit"?"Credit":"Reconciled";}
function statusClass(s:ReconciliationStatus){return s==="reconciled"?"ok":s==="reconciled_with_credit"?"info":s==="needs_review"?"warn":s==="unmatched"?"danger":"muted";}

function ResolveDrawer({transaction,leases,onClose,onDone}:{transaction:Transaction;leases:Lease[];onClose:()=>void;onDone:()=>void}){
 const [leaseId,setLeaseId]=useState(transaction.matchedLease?.id?String(transaction.matchedLease.id):"");
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 async function resolve(){
  if(!leaseId)return; setSaving(true);setError("");
  try{await apiRequest(`/payment-reconciliation/transactions/${transaction.id}/resolve`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lease_id:Number(leaseId)})});onDone();}
  catch(e){setError(e instanceof Error?e.message:"Could not reconcile transaction.");}finally{setSaving(false);}
 }
 return <div className="mg-drawer" role="dialog" aria-modal="true" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="mg-drawer__panel">
   <div className="mg-drawer__head"><div><h2 className="mg-drawer__title">Resolve payment</h2><p className="mg-drawer__sub">Choose the lease this external payment belongs to. The PMS will allocate it across the tenant's oldest outstanding rent first.</p></div><button className="mg-iconbtn" onClick={onClose} aria-label="Close"><X/></button></div>
   <div className="mg-drawer__body">
    {error&&<div className="mg-alert"><AlertCircle/><span>{error}</span></div>}
    <div className="mg-stat"><p className="mg-stat__label">Transaction</p><p className="mg-stat__value">{formatMoney(transaction.amount,transaction.currency)}</p><p className="mg-stat__hint">{transaction.external_transaction_id}</p></div>
    <div className="mg-field"><label className="mg-label" htmlFor="resolve-lease">Lease / tenant</label><select id="resolve-lease" className="mg-select" value={leaseId} onChange={e=>setLeaseId(e.target.value)}><option value="">Choose the correct lease</option>{leases.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
   </div>
   <div className="mg-drawer__foot"><button className="mg-btn mg-btn--subtle" onClick={onClose}>Cancel</button><button className="mg-btn mg-btn--primary" disabled={!leaseId||saving} onClick={()=>void resolve()}><CheckCircle2/>{saving?"Resolving…":"Resolve payment"}</button></div>
  </div>
 </div>
}

function ReconciliationPage(){
 const currency=useMemo(readCurrency,[]); const [items,setItems]=useState<Transaction[]>([]),[leases,setLeases]=useState<Lease[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState("all"),[selected,setSelected]=useState<Transaction|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const [p,l]=await Promise.all([apiRequest("/payment-reconciliation"),apiRequest("/leases")]);setItems(parse(p));setLeases(rows(l).map(r=>{const t=toRecord(r.tenant),u=toRecord(r.unit),pr=toRecord(r.property);return{id:asNumber(r.id),label:[asString(t.name)||`Lease #${asNumber(r.id)}`,asString(u.unit_number)?`· ${asString(u.unit_number)}`:"",asString(pr.name)?`· ${asString(pr.name)}`:""].filter(Boolean).join(" ")}}));}catch(e){setError(e instanceof Error?e.message:"Could not load reconciliation queue.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load()},[load]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return items.filter(x=>(filter==="all"||x.status===filter)&&(!q||[x.external_transaction_id,x.payment_reference??"",x.payer_phone??"",x.matchedLease?.tenant?.name??"",x.matchedLease?.property?.name??"",x.matchedLease?.unit?.unit_number??""].join(" ").toLowerCase().includes(q))).sort((a,b)=>b.transaction_at.localeCompare(a.transaction_at));},[items,filter,query]);
 const summary=useMemo(()=>({total:items.length,review:items.filter(x=>x.status==="needs_review").length,unmatched:items.filter(x=>x.status==="unmatched").length,reconciled:items.filter(x=>x.status==="reconciled"||x.status==="reconciled_with_credit").length}),[items]);
 return <DashboardLayout><div className="mg-root"><style>{managerStyles}</style><div className="mg-shell">
  <header className="mg-header"><div><span className="mg-eyebrow"><WalletCards/> Reconciliation</span><h1 className="mg-title">Payment Reconciliation</h1><p className="mg-subtitle">External money received by the organization, matched against tenants and rent obligations. Nothing ambiguous is silently applied.</p></div><button className="mg-btn mg-btn--subtle" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?"mg-spin":undefined}/>Refresh</button></header>
  {error&&<div className="mg-alert"><AlertCircle/><span>{error}</span></div>}
  <section className="mg-stats"><article className="mg-stat"><p className="mg-stat__label">Transactions</p><p className="mg-stat__value">{summary.total}</p></article><article className="mg-stat"><p className="mg-stat__label">Needs review</p><p className="mg-stat__value">{summary.review}</p></article><article className="mg-stat"><p className="mg-stat__label">Unmatched</p><p className="mg-stat__value">{summary.unmatched}</p></article><article className="mg-stat"><p className="mg-stat__label">Reconciled</p><p className="mg-stat__value">{summary.reconciled}</p></article></section>
  <div className="mg-toolbar"><div className="mg-search"><Search/><input className="mg-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transaction, tenant, phone, reference or unit…"/></div><div className="mg-chips">{STATUS.map(s=><button key={s.id} className={`mg-chip${filter===s.id?" mg-chip--on":""}`} onClick={()=>setFilter(s.id)}>{s.label}</button>)}</div></div>
  <section className="mg-panel"><div className="mg-panel__head"><h2 className="mg-panel__title"><WalletCards/> Incoming transactions</h2><span className="mg-panel__meta">{visible.length} shown</span></div>
   {loading?<div className="mg-panel__body">{[1,2,3,4].map(i=><span key={i} className="mg-skeleton" style={{height:"2.4rem",marginBottom:".6rem"}}/>)}</div>:visible.length===0?<div className="mg-empty"><WalletCards/><p className="mg-empty__title">No transactions found</p><p className="mg-empty__text">{items.length?"Try a different filter or search.":"External payment transactions will appear here once the payment rails begin sending them to the PMS."}</p></div>:<div className="mg-tablewrap"><table className="mg-table"><thead><tr><th>Date</th><th>Tenant / destination</th><th>Reference</th><th>Allocation</th><th>Status</th><th></th></tr></thead><tbody>{visible.map(x=><tr key={x.id} onClick={()=>setSelected(x)} style={{cursor:"pointer"}}><td className="mg-nowrap">{formatDate(x.transaction_at)}<span className="mg-sub">{x.provider} · {x.external_transaction_id}</span></td><td><span className="mg-strong">{x.matchedLease?.tenant?.name||"Unmatched payer"}</span><span className="mg-sub">{x.matchedLease?.unit?.unit_number||"—"} · {x.matchedLease?.property?.name||"Destination pending"}</span></td><td><span className="mg-strong">{x.payment_reference||"No reference"}</span><span className="mg-sub">{x.payer_phone||"No phone"}</span></td><td><span className="mg-strong">{formatMoney(x.amount,x.currency)}</span>{x.payment?.allocations?.length?<span className="mg-sub">{x.payment.allocations.length} rent allocation{x.payment.allocations.length===1?"":"s"}</span>:null}</td><td><span className={`mg-badge mg-badge--${statusClass(x.status)}`}>{statusLabel(x.status)}</span></td><td className="mg-num"><ArrowRight/></td></tr>)}</tbody></table></div>}
  </section>
 </div>
 {selected&&<div className="mg-drawer" role="dialog" aria-modal="true" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="mg-drawer__panel"><div className="mg-drawer__head"><div><span className="mg-eyebrow"><Clock3/> Transaction details</span><h2 className="mg-drawer__title">{formatMoney(selected.amount,selected.currency)}</h2><p className="mg-drawer__sub">{selected.external_transaction_id} · {formatDate(selected.transaction_at)}</p></div><button className="mg-iconbtn" onClick={()=>setSelected(null)} aria-label="Close"><X/></button></div>
 <div className="mg-drawer__body"><div className="mg-grid2"><div className="mg-stat"><p className="mg-stat__label">Tenant</p><p className="mg-strong">{selected.matchedLease?.tenant?.name||"Not matched"}</p></div><div className="mg-stat"><p className="mg-stat__label">Payer</p><p className="mg-strong">{selected.payer_phone||"—"}</p></div></div>
  <div className="mg-stat"><p className="mg-stat__label">Payment reference</p><p className="mg-strong">{selected.payment_reference||"No reference supplied"}</p></div>
  {selected.reconciliation_note&&<div className="mg-alert"><AlertCircle/><span>{selected.reconciliation_note}</span></div>}
  <div className="mg-panel"><div className="mg-panel__head"><h3 className="mg-panel__title">Rent allocation</h3></div>{selected.payment?.allocations?.length?<div className="mg-panel__body">{selected.payment.allocations.map(a=><div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:".75rem 0",borderBottom:"1px solid #e5e7eb"}}><span>{a.rentObligation?.period?new Date(a.rentObligation.period).toLocaleDateString(undefined,{month:"long",year:"numeric"}):"Rent obligation"}</span><strong>{formatMoney(a.amount,selected.currency)}</strong></div>)}</div>:<div className="mg-empty"><p className="mg-empty__text">No rent allocation has been recorded.</p></div>}</div>
 </div><div className="mg-drawer__foot">{["needs_review","unmatched"].includes(selected.status)?<button className="mg-btn mg-btn--primary" onClick={()=>{const x=selected;setSelected(null);setSelected({...x});}}><XCircle/> Resolve transaction</button>:null}<button className="mg-btn mg-btn--subtle" onClick={()=>setSelected(null)}>Close</button></div></div></div>}
 {selected&&["needs_review","unmatched"].includes(selected.status)&&<ResolveDrawer transaction={selected} leases={leases} onClose={()=>setSelected(null)} onDone={()=>{setSelected(null);void load()}}/>}
 </div></DashboardLayout>
}
export default ReconciliationPage;
