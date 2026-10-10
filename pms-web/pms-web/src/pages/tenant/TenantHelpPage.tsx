import { useEffect, useState } from "react";
import { BookOpen, Building2, FileText, LifeBuoy, Mail, MapPin, Phone, ShieldCheck, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import TenantDashboardLayout from "../../layouts/TenantDashboardLayout";
import { apiRequest } from "../../services/api";
type Home={manager_name:string|null;manager_logo_url:string|null;manager_tagline:string|null;manager_phone:string|null;manager_email:string|null;manager_address:string|null;manager_city:string|null;manager_country:string|null;property_name:string|null};
export default function TenantHelpPage(){
const[home,setHome]=useState<Home|null>(null);const[loading,setLoading]=useState(true);
useEffect(()=>{void(async()=>{try{const response:any=await apiRequest("/tenant/overview");setHome(response?.data?.home??null)}catch{setHome(null)}finally{setLoading(false)}})()},[]);
const name=home?.manager_name??"Property management";
const address=[home?.manager_address,home?.manager_city,home?.manager_country].filter(Boolean).join(", ");
return <TenantDashboardLayout title="Help & support" subtitle="Need assistance? Your property management team is here to help.">
<div style={{maxWidth:900,margin:"0 auto",display:"grid",gap:"1rem"}}>
<section className="tp-card" style={{padding:"1.5rem",textAlign:"center"}}>
<div style={{width:"4.5rem",height:"4.5rem",margin:"0 auto 1rem",borderRadius:"1.25rem",display:"grid",placeItems:"center",background:"var(--tp-surface-sunken)",border:"1px solid var(--tp-line)",overflow:"hidden"}}>{home?.manager_logo_url?<img src={home.manager_logo_url} alt={name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<Building2 style={{width:"2rem",height:"2rem"}}/>}</div>
<h2 style={{margin:0,fontSize:"1.5rem"}}>{name}</h2>
{home?.manager_tagline&&<p style={{margin:".45rem auto 0",maxWidth:560,color:"var(--tp-muted)",fontSize:".9rem"}}>{home.manager_tagline}</p>}
{home?.property_name&&<p style={{margin:".7rem 0 0",color:"var(--tp-muted)",fontSize:".75rem"}}>Managing {home.property_name}</p>}
</section>
<section className="tp-card" style={{padding:"1.25rem"}}><div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:"1rem"}}><LifeBuoy/><div><h3 style={{margin:0}}>Contact your property manager</h3><p style={{margin:".2rem 0 0",color:"var(--tp-muted)",fontSize:".75rem"}}>Use the details below for questions, tenancy support or urgent property matters.</p></div></div>
<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:".7rem"}}>
{home?.manager_email&&<a href={"mailto:"+home.manager_email} className="tp-card" style={{padding:".9rem",textDecoration:"none",color:"inherit",border:"1px solid var(--tp-line)"}}><Mail/><strong style={{display:"block",marginTop:".4rem"}}>{home.manager_email}</strong><small style={{color:"var(--tp-muted)"}}>Email support</small></a>}
{home?.manager_phone&&<a href={"tel:"+home.manager_phone} className="tp-card" style={{padding:".9rem",textDecoration:"none",color:"inherit",border:"1px solid var(--tp-line)"}}><Phone/><strong style={{display:"block",marginTop:".4rem"}}>{home.manager_phone}</strong><small style={{color:"var(--tp-muted)"}}>Call support</small></a>}
{address&&<div className="tp-card" style={{padding:".9rem",border:"1px solid var(--tp-line)",gridColumn:"1 / -1"}}><MapPin/><strong style={{display:"block",marginTop:".4rem"}}>{address}</strong><small style={{color:"var(--tp-muted)"}}>Office / support address</small></div>}
</div></section>
<section className="tp-card" style={{padding:"1.25rem"}}><h3 style={{margin:"0 0 .4rem"}}>Need to report something?</h3><p style={{margin:"0 0 1rem",color:"var(--tp-muted)",fontSize:".8rem",lineHeight:1.5}}>For repairs, leaks, electrical problems or anything affecting your home, submit a maintenance request so your manager can track it from start to finish.</p><Link to="/tenant/maintenance?action=new" className="tp-btn tp-btn--primary"><Wrench/> Request maintenance</Link></section>
{!loading&&!home&&<section className="tp-card" style={{padding:"1rem",color:"var(--tp-muted)"}}>Your property manager contact details have not been configured yet. Please contact your management office directly if you have their details.</section>}\n<section className="tp-card" style={{padding:"1.25rem"}}><div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:".75rem"}}><BookOpen/><div><h3 style={{margin:0}}>User manual & important information</h3><p style={{margin:".2rem 0 0",color:"var(--tp-muted)",fontSize:".75rem"}}>Find answers about payments, your lease, maintenance requests, account access and privacy.</p></div></div><div style={{display:"flex",flexWrap:"wrap",gap:".65rem"}}><Link to="/help" className="tp-btn tp-btn--quiet"><BookOpen/> Search help manual</Link><Link to="/terms" className="tp-btn tp-btn--quiet"><FileText/> Terms of service</Link><Link to="/privacy" className="tp-btn tp-btn--quiet"><ShieldCheck/> Privacy policy</Link></div></section>
</div></TenantDashboardLayout>}