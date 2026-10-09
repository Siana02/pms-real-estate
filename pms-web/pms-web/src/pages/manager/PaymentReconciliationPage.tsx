import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, RefreshCw, Search, WalletCards, X, XCircle } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import { formatDate, formatMoney, readCurrency, rows, asNumber, asString, toRecord, namedRef } from "../../services/format";

type ReconciliationStatus = "pending" | "reconciled" | "reconciled_with_credit" | "needs_review" | "unmatched";
interface Allocation { id:number; amount:number; rentObligation:{id:number; period:string; due_date:string; amount_due:number}|null }
interface Credit { id:number; amount:number; remaining_amount:number; status:string; notes:string|null }
interface Transaction {
 id:number; provider:string; external_transaction_id:string; amount:number; currency:string; payer_phone:string|null; merchantShortcode:string|null; source:string|null;
 payment_reference:string|null; transaction_at:string; status:ReconciliationStatus; reconciliation_note:string|null;
 matchedLease:{id:number; tenant:{id:number;name:string}|null; property:{id:number;name:string}|null; unit:{id:number;unit_number:string}|null}|null;
 matchedRentObligation:{id:number;period:string;due_date:string;amount_due:number;balance:number;status:string}|null;
 payment:{id:number; amount:number; allocations:Allocation[]; credits:Credit[]}|null;
 paymentDestination:{id:number;propertyId:number;propertyName:string|null;method:string;details:Record<string,unknown>}|null;
 rawPayload:Record<string,unknown>;
}
interface Lease { id:number; label:string; property_id:number }
interface Destination { id:number; property_id:number; property_name:string|null; method:string; details:Record<string,unknown>; is_active:boolean; daraja?:{c2b_authorization_status?:string} }

const STATUS: {id:ReconciliationStatus|"all";label:string}[]=[
 {id:"all",label:"All"}, {id:"needs_review",label:"Needs review"}, {id:"unmatched",label:"Unmatched"},
 {id:"reconciled",label:"Reconciled"}, {id:"reconciled_with_credit",label:"Credit"}, {id:"pending",label:"Pending"}
];

function parse(payload:unknown):Transaction[]{
 return rows(toRecord(payload).data ?? payload).map(r=>{
  const lease=toRecord(r.matchedLease ?? r.matched_lease), tenant=toRecord(lease.tenant), property=toRecord(lease.property), unit=toRecord(lease.unit);
  const tenantName = asString(tenant.name) || [asString(tenant.first_name), asString(tenant.last_name)].filter(Boolean).join(" ") || asString(tenant.full_name) || asString(tenant.email) || "";
  const obligation=toRecord(r.matchedRentObligation ?? r.matched_rent_obligation);
  const payment=toRecord(r.payment);
  const destination=toRecord(r.paymentDestination ?? r.payment_destination);
  const destinationProperty=toRecord(destination.property);
  const allocations=rows(payment.allocations).map(a=>{
   const o=toRecord(a.rentObligation ?? a.rent_obligation);
   return {id:asNumber(a.id),amount:asNumber(a.amount),rentObligation:o.id?{id:asNumber(o.id),period:asString(o.period),due_date:asString(o.due_date),amount_due:asNumber(o.amount_due)}:null};
  });
  const credits=rows(payment.rentPaymentCredits ?? payment.rent_payment_credits).map(c=>({
   id:asNumber(c.id),amount:asNumber(c.amount),remaining_amount:asNumber(c.remaining_amount),
   status:asString(c.status),notes:asString(c.notes)||null
  }));
  return {
   id:asNumber(r.id), provider:asString(r.provider)||"unknown", external_transaction_id:asString(r.external_transaction_id),
   amount:asNumber(r.amount), currency:asString(r.currency)||"KES", payer_phone:asString(r.payer_phone)||null, merchantShortcode:asString(toRecord(r.raw_payload).business_short_code)||null, source:asString(toRecord(r.raw_payload).source)||null,
   payment_reference:asString(r.payment_reference)||null, transaction_at:asString(r.transaction_at),
   status:(STATUS.some(s=>s.id===r.status)?asString(r.status):"pending") as ReconciliationStatus,
   reconciliation_note:asString(r.reconciliation_note)||null,
   matchedLease:lease.id?{id:asNumber(lease.id),tenant:tenant.id?{id:asNumber(tenant.id),name:tenantName}:null,property:property.id?{id:asNumber(property.id),name:asString(property.name)}:null,unit:unit.id?{id:asNumber(unit.id),unit_number:asString(unit.unit_number)}:null}:null,
   matchedRentObligation:obligation.id?{id:asNumber(obligation.id),period:asString(obligation.period),due_date:asString(obligation.due_date),amount_due:asNumber(obligation.amount_due),balance:asNumber(obligation.balance),status:asString(obligation.status)}:null,
   payment:payment.id?{id:asNumber(payment.id),amount:asNumber(payment.amount),allocations,credits}:null,
   paymentDestination:destination.id?{id:asNumber(destination.id),propertyId:asNumber(destination.property_id),propertyName:asString(destinationProperty.name)||asString(destination.property_name)||null,method:asString(destination.method),details:toRecord(destination.details)}:null,
   rawPayload:toRecord(r.raw_payload)
  };
 });
}
function statusLabel(s:ReconciliationStatus){return s==="pending"?"Pending confirmation":s==="needs_review"?"Needs review":s==="unmatched"?"Unmatched":s==="reconciled_with_credit"?"Reconciled · credit":s==="reconciled"?"Reconciled":"Unknown status";}
function statusClass(s:ReconciliationStatus){return s==="reconciled"?"ok":s==="reconciled_with_credit"?"info":s==="needs_review"?"warn":s==="unmatched"?"danger":"muted";}

function ResolveDrawer({transaction,leases,destinations,onClose,onDone}:{transaction:Transaction;leases:Lease[];destinations:Destination[];onClose:()=>void;onDone:()=>void}){
 const [leaseId,setLeaseId]=useState(transaction.matchedLease?.id?String(transaction.matchedLease.id):"");
 const [destinationId,setDestinationId]=useState(transaction.paymentDestination?.id?String(transaction.paymentDestination.id):"");
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 const payload=transaction.rawPayload??{};
 const isC2b=payload.source==="c2b_confirmation";
 const shortcode=String(payload.business_short_code??"");
 const candidateIds=Array.isArray(payload.candidate_destination_ids)?payload.candidate_destination_ids.map(Number):[];
 const eligibleDestinations=destinations.filter(d=>{
  const shortcodeValue=String(d.method==="mpesa_paybill"?(d.details.paybill??""):d.method==="mpesa_till"?(d.details.till??""):"");
  return d.is_active&&d.daraja?.c2b_authorization_status==="ready"&&shortcodeValue===shortcode&&(candidateIds.length===0||candidateIds.includes(d.id));
 });
 const chosenDestination=eligibleDestinations.find(d=>String(d.id)===destinationId);
 const selectedPropertyId=transaction.paymentDestination?.propertyId??chosenDestination?.property_id;
 const eligibleLeases=selectedPropertyId?leases.filter(l=>l.property_id===selectedPropertyId):leases;
 async function resolve(){
  if(!leaseId||(isC2b&&!destinationId))return;
  setSaving(true);setError("");
  try{
   const body:Record<string,number>={lease_id:Number(leaseId)};
   if(isC2b)body.payment_destination_id=Number(destinationId);
   await apiRequest(`/payment-reconciliation/transactions/${transaction.id}/resolve`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   onDone();
  }catch(e){setError(e instanceof Error?e.message:"Could not reconcile transaction.");}finally{setSaving(false);}
 }
 return <div className="mg-drawer" role="dialog" aria-modal="true" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="mg-drawer__panel">
   <div className="mg-drawer__head"><div><h2 className="mg-drawer__title">Resolve payment</h2><p className="mg-drawer__sub">Choose the verified payment destination and lease. The PMS will allocate the payment across that lease's oldest outstanding rent first.</p></div><button className="mg-iconbtn" onClick={onClose} aria-label="Close"><X/></button></div>
   <div className="mg-drawer__body">
    {error&&<div className="mg-alert"><AlertCircle/><span>{error}</span></div>}
    <div className="mg-stat"><p className="mg-stat__label">Transaction</p><p className="mg-stat__value">{formatMoney(transaction.amount,transaction.currency)}</p><p className="mg-stat__hint">{transaction.external_transaction_id}</p></div>
    {isC2b&&<div className="mg-field"><label className="mg-label" htmlFor="resolve-destination">Verified payment destination</label>
     {transaction.paymentDestination?<p className="mg-strong">{transaction.paymentDestination.propertyName||"Property"} · {transaction.paymentDestination.method.replace("mpesa_","M-PESA ")}</p>:
      <select id="resolve-destination" className="mg-select" value={destinationId} onChange={e=>{setDestinationId(e.target.value);setLeaseId("");}}><option value="">Choose the correct property destination</option>{eligibleDestinations.map(d=><option key={d.id} value={d.id}>{d.property_name||`Property #${d.property_id}`} · {d.method==="mpesa_paybill"?"PayBill":"Till"} · #{d.id}</option>)}</select>}
     <p className="mg-hint">Shortcode: {shortcode||"not provided"}. The destination must have verified C2B authorization.</p>
    </div>}
    <div className="mg-field"><label className="mg-label" htmlFor="resolve-lease">Lease / tenant</label><select id="resolve-lease" className="mg-select" value={leaseId} onChange={e=>setLeaseId(e.target.value)}><option value="">Choose the correct lease</option>{eligibleLeases.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
    {!eligibleLeases.length&&<p className="mg-hint">No leases are available for the selected property. Confirm the destination and lease records before resolving.</p>}
   </div>
   <div className="mg-drawer__foot"><button className="mg-btn mg-btn--subtle" onClick={onClose}>Cancel</button><button className="mg-btn mg-btn--primary" disabled={!leaseId||(isC2b&&!destinationId)||saving} onClick={()=>void resolve()}><CheckCircle2/>{saving?"Resolving…":"Resolve payment"}</button></div>
  </div>
 </div>
}
function ReconciliationPage(){
 const currency=useMemo(readCurrency,[]); const [items,setItems]=useState<Transaction[]>([]),[leases,setLeases]=useState<Lease[]>([]),[destinations,setDestinations]=useState<Destination[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState("all"),[selected,setSelected]=useState<Transaction|null>(null),[resolving,setResolving]=useState(false);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const [p,l,d]=await Promise.all([apiRequest("/payment-reconciliation"),apiRequest("/leases"),apiRequest("/organization/payment-destinations")]);setItems(parse(p));setLeases(rows(l).map(r=>{const t=toRecord(r.tenant),u=toRecord(r.unit),pr=toRecord(r.property);return{id:asNumber(r.id),property_id:asNumber(r.property_id),label:[asString(t.name)||`Lease #${asNumber(r.id)}`,asString(u.unit_number)?`· ${asString(u.unit_number)}`:"",asString(pr.name)?`· ${asString(pr.name)}`:""].filter(Boolean).join(" ")}}));setDestinations(rows(toRecord(d).data??d).map(r=>({id:asNumber(r.id),property_id:asNumber(r.property_id),property_name:asString(r.property_name)||null,method:asString(r.method),details:toRecord(r.details),is_active:Boolean(r.is_active),daraja:toRecord(r.daraja) as Destination["daraja"]})));}catch(e){setError(e instanceof Error?e.message:"Could not load reconciliation queue.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load()},[load]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return items.filter(x=>(filter==="all"||x.status===filter)&&(!q||[x.external_transaction_id,x.payment_reference??"",x.payer_phone??"",x.merchantShortcode??"",x.matchedLease?.tenant?.name??"",x.matchedLease?.property?.name??"",x.matchedLease?.unit?.unit_number??""].join(" ").toLowerCase().includes(q))).sort((a,b)=>b.transaction_at.localeCompare(a.transaction_at));},[items,filter,query]);
 const summary=useMemo(()=>({total:items.length,review:items.filter(x=>x.status==="needs_review").length,unmatched:items.filter(x=>x.status==="unmatched").length,reconciled:items.filter(x=>x.status==="reconciled"||x.status==="reconciled_with_credit").length}),[items]);
 return <DashboardLayout><div className="mg-root"><style>{managerStyles}</style><div className="mg-shell">
  <header className="mg-header"><div><span className="mg-eyebrow"><WalletCards/> Reconciliation</span><h1 className="mg-title">Payment Reconciliation</h1><p className="mg-subtitle">External money received by the organization, matched against tenants and rent obligations. Nothing ambiguous is silently applied.</p></div><button className="mg-btn mg-btn--subtle" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?"mg-spin":undefined}/>Refresh</button></header>
  {error&&<div className="mg-alert"><AlertCircle/><span>{error}</span></div>}
  <section className="mg-stats"><article className="mg-stat"><p className="mg-stat__label">Transactions</p><p className="mg-stat__value">{summary.total}</p></article><article className="mg-stat"><p className="mg-stat__label">Needs review</p><p className="mg-stat__value">{summary.review}</p></article><article className="mg-stat"><p className="mg-stat__label">Unmatched</p><p className="mg-stat__value">{summary.unmatched}</p></article><article className="mg-stat"><p className="mg-stat__label">Reconciled</p><p className="mg-stat__value">{summary.reconciled}</p></article></section>
  <div className="mg-toolbar"><div className="mg-search"><Search/><input className="mg-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transaction, tenant, phone, reference or unit…"/></div><div className="mg-chips">{STATUS.map(s=><button key={s.id} className={`mg-chip${filter===s.id?" mg-chip--on":""}`} onClick={()=>setFilter(s.id)}>{s.label}</button>)}</div></div>
  <section className="mg-panel"><div className="mg-panel__head"><h2 className="mg-panel__title"><WalletCards/> Incoming transactions</h2><span className="mg-panel__meta">{visible.length} shown</span></div>
   {loading?<div className="mg-panel__body">{[1,2,3,4].map(i=><span key={i} className="mg-skeleton" style={{height:"2.4rem",marginBottom:".6rem"}}/>)}</div>:visible.length===0?<div className="mg-empty"><WalletCards/><p className="mg-empty__title">No transactions found</p><p className="mg-empty__text">{items.length?"Try a different filter or search.":"External payment transactions will appear here once the payment rails begin sending them to the PMS."}</p></div>:<div className="mg-tablewrap"><table className="mg-table"><thead><tr><th>Date</th><th>Tenant / destination</th><th>Reference</th><th>Allocation</th><th>Status</th><th></th></tr></thead><tbody>{visible.map(x=><tr key={x.id} onClick={()=>setSelected(x)} style={{cursor:"pointer"}}><td className="mg-nowrap">{formatDate(x.transaction_at)}<span className="mg-sub">{x.source==="c2b_confirmation"?"Direct M-PESA C2B":x.source==="stk_callback"?"STK Push":x.provider} · {x.external_transaction_id}{x.merchantShortcode?` · Shortcode ${x.merchantShortcode}`:""}</span></td><td><span className="mg-strong">{x.matchedLease?.tenant?.name||"Unmatched payer"}</span><span className="mg-sub">{x.matchedLease?.unit?.unit_number||"—"} · {x.matchedLease?.property?.name||x.paymentDestination?.propertyName||"Payment destination"}</span></td><td><span className="mg-strong">{x.payment_reference||"No reference"}</span><span className="mg-sub">{x.payer_phone||"No phone"}</span></td><td><span className="mg-strong">{formatMoney(x.amount,x.currency)}</span>{x.payment?.allocations?.length?<span className="mg-sub">{x.payment.allocations.length} rent allocation{x.payment.allocations.length===1?"":"s"}</span>:null}
{x.payment?.credits?.length?<span className="mg-sub">{formatMoney(x.payment.credits.reduce((sum,c)=>sum+c.amount,0),x.currency)} credit created</span>:null}</td><td><span className={`mg-badge mg-badge--${statusClass(x.status)}`}>{statusLabel(x.status)}</span></td><td className="mg-num"><ArrowRight/></td></tr>)}</tbody></table></div>}
  </section>
 </div>
 {selected&&createPortal(<div className="mg-drawer" role="dialog" aria-modal="true" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="mg-drawer__panel"><div className="mg-drawer__head"><div><span className="mg-eyebrow"><Clock3/> Transaction details</span><h2 className="mg-drawer__title">{formatMoney(selected.amount,selected.currency)}</h2><p className="mg-drawer__sub">{selected.external_transaction_id} · {formatDate(selected.transaction_at)}</p></div><button className="mg-iconbtn" onClick={()=>setSelected(null)} aria-label="Close"><X/></button></div>
 <div className="mg-drawer__body"><div className="mg-grid2"><div className="mg-stat"><p className="mg-stat__label">Tenant</p><p className="mg-strong">{selected.matchedLease?.tenant?.name||"Not matched"}</p></div><div className="mg-stat"><p className="mg-stat__label">Payer</p><p className="mg-strong">{selected.payer_phone||"—"}</p></div></div>
  <div className="mg-stat"><p className="mg-stat__label">Payment reference / account reference</p><p className="mg-strong">{selected.payment_reference||"No reference supplied"}</p>{selected.merchantShortcode&&<p className="mg-stat__hint">Merchant shortcode: {selected.merchantShortcode}</p>}<p className="mg-stat__hint">Source: {selected.source==="c2b_confirmation"?"Direct M-PESA C2B callback":selected.source==="stk_callback"?"STK Push callback":selected.provider}</p></div>
  {selected.reconciliation_note&&<div className="mg-alert"><AlertCircle/><span>{selected.reconciliation_note}</span></div>}
  <div className="mg-panel"><div className="mg-panel__head"><h3 className="mg-panel__title">Rent allocation</h3></div>{selected.payment?.allocations?.length||selected.payment?.credits?.length?<div className="mg-panel__body">{selected.payment.allocations.map(a=><div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:".75rem 0",borderBottom:"1px solid #e5e7eb"}}><span>{a.rentObligation?.period?new Date(a.rentObligation.period).toLocaleDateString(undefined,{month:"long",year:"numeric"}):"Rent obligation"}</span><strong>{formatMoney(a.amount,selected.currency)}</strong></div>)}
{selected.payment.credits.map(c=><div key={`credit-${c.id}`} style={{display:"flex",justifyContent:"space-between",padding:".75rem 0",borderBottom:"1px solid #e5e7eb"}}><span><strong>Future rent credit</strong><span className="mg-sub">{c.status==="available"?formatMoney(c.remaining_amount,selected.currency)+" remaining":"Credit "+c.status}</span></span><strong>{formatMoney(c.amount,selected.currency)}</strong></div>)}</div>:<div className="mg-empty"><p className="mg-empty__text">No rent allocation has been recorded.</p></div>}</div>
 </div><div className="mg-drawer__foot">{["needs_review","unmatched"].includes(selected.status)?<button className="mg-btn mg-btn--primary" onClick={()=>setResolving(true)}><XCircle/> Resolve transaction</button>:null}<button className="mg-btn mg-btn--subtle" onClick={()=>setSelected(null)}>Close</button></div></div></div>, document.body)}
 {resolving&&selected&&["needs_review","unmatched"].includes(selected.status)&&createPortal(<ResolveDrawer transaction={selected} leases={leases} destinations={destinations} onClose={()=>setResolving(false)} onDone={()=>{setResolving(false);setSelected(null);void load()}}/>, document.body)}
 </div></DashboardLayout>
}
export default ReconciliationPage;
