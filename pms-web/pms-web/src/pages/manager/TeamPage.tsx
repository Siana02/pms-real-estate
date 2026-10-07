import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, MoreVertical, RefreshCw, Shield, UserPlus, Users } from "lucide-react";
import { apiRequest } from "../../services/api";
import DashboardLayout from "../../layouts/DashboardLayout";

type Employee = {
  id: number; name: string; username: string; email: string;
  role: "property_manager" | "staff";
  status: "active" | "invited" | "suspended" | "deactivated";
  last_active_at: string | null; invited_at: string | null; invitation_expires_at: string | null;
};
type ApiResponse = { data?: Employee[]; message?: string; invitation_url?: string; email_sent?: boolean };
const STATUS_LABELS: Record<Employee["status"], string> = { active: "Active", invited: "Invited", suspended: "Suspended", deactivated: "Deactivated" };

const styles = `
.tm-root{min-height:100%;padding:2rem;color:#24313d}.tm-shell{max-width:1180px;margin:0 auto}.tm-header{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.tm-eyebrow{display:inline-flex;align-items:center;gap:.45rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#8b96a1}.tm-title{margin:.35rem 0 0;font-size:clamp(1.7rem,3vw,2.35rem);letter-spacing:-.04em}.tm-subtitle{margin:.45rem 0 0;max-width:680px;color:#7a8792;font-size:.9rem;line-height:1.6}.tm-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.55rem;padding:.65rem .9rem;border-radius:.7rem;border:1px solid #dce2e6;background:#fff;color:#24313d;font:inherit;font-size:.82rem;font-weight:650;cursor:pointer}.tm-btn svg{width:1rem;height:1rem}.tm-btn--primary{background:#315f8a;border-color:#315f8a;color:#fff}.tm-btn--ghost:hover{background:#f5f7f8}.tm-btn:disabled{opacity:.55;cursor:not-allowed}.tm-alert{display:flex;align-items:center;gap:.6rem;padding:.8rem .9rem;margin-bottom:1rem;border:1px solid #ecd6d2;background:#fbf2f0;color:#82463f;border-radius:.75rem;font-size:.82rem}.tm-alert--ok{border-color:#d6e8dc;background:#f1f8f3;color:#356345}.tm-panel{background:#fff;border:1px solid #e3e7ea;border-radius:1rem;overflow:hidden;box-shadow:0 8px 30px rgba(30,45,58,.04)}.tm-panel__head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.15rem;border-bottom:1px solid #edf0f2}.tm-panel__title{display:flex;align-items:center;gap:.55rem;margin:0;font-size:.95rem}.tm-panel__title svg{width:1.05rem;color:#315f8a}.tm-meta{color:#8a949d;font-size:.75rem}.tm-table{width:100%;border-collapse:collapse}.tm-table th{padding:.75rem 1.15rem;text-align:left;font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;color:#9aa2aa;font-weight:700;background:#fafbfb}.tm-table td{padding:.9rem 1.15rem;border-top:1px solid #edf0f2;font-size:.82rem;vertical-align:middle}.tm-person{display:flex;align-items:center;gap:.7rem;min-width:190px}.tm-avatar{display:flex;align-items:center;justify-content:center;width:2.15rem;height:2.15rem;border-radius:50%;background:#f0f4f7;color:#315f8a;font-weight:750;font-size:.72rem;flex:none}.tm-name{font-weight:700;color:#263644}.tm-email{margin-top:.15rem;color:#9099a2;font-size:.7rem}.tm-pill{display:inline-flex;align-items:center;padding:.28rem .55rem;border-radius:999px;font-size:.68rem;font-weight:700}.tm-pill--active{background:#edf7f0;color:#356345}.tm-pill--invited{background:#f4f1fb;color:#67518a}.tm-pill--deactivated{background:#f4f5f6;color:#78838d}.tm-pill--suspended{background:#fbf2f0;color:#82463f}.tm-actions{position:relative;text-align:right}.tm-menu-wrap{position:relative;display:inline-block}.tm-menu-button{width:2.2rem;height:2.2rem;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:.6rem;background:transparent;color:#6e7983;cursor:pointer}.tm-menu-button:hover{background:#f5f7f8;border-color:#e5e9ec}.tm-menu{position:absolute;right:0;top:2.45rem;z-index:10;width:190px;padding:.35rem;background:#fff;border:1px solid #e1e6e9;border-radius:.75rem;box-shadow:0 16px 35px rgba(25,38,49,.12)}.tm-menu button{width:100%;display:block;padding:.58rem .65rem;border:0;border-radius:.5rem;background:transparent;text-align:left;color:#34404c;font:inherit;font-size:.76rem;cursor:pointer}.tm-menu button:hover{background:#f5f7f8}.tm-menu button.danger:hover{background:#fbf2f0;color:#82463f}.tm-empty{padding:3rem 1.5rem;text-align:center;color:#87919a}.tm-empty svg{width:2rem;height:2rem;margin-bottom:.7rem;color:#b1bac1}.tm-overlay{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(20,31,41,.42)}.tm-modal{width:min(100%,520px);background:#fff;border-radius:1rem;box-shadow:0 24px 70px rgba(0,0,0,.18);overflow:hidden}.tm-modal__head{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.2rem;border-bottom:1px solid #edf0f2}.tm-modal__head h2{margin:0;font-size:1rem}.tm-modal__body{padding:1.2rem}.tm-field{display:grid;gap:.4rem;margin-bottom:1rem}.tm-field label{font-size:.7rem;font-weight:700;color:#68747e}.tm-field input,.tm-field select{width:100%;min-height:2.65rem;padding:.65rem .75rem;border:1px solid #d9e0e4;border-radius:.65rem;outline:none;background:#fff;color:#24313d;font:inherit;font-size:.82rem}.tm-field input:focus,.tm-field select:focus{border-color:#8ca9bf;box-shadow:0 0 0 3px rgba(49,95,138,.08)}.tm-hint{margin:-.45rem 0 1rem;color:#8a949d;font-size:.72rem;line-height:1.5}.tm-modal__actions{display:flex;justify-content:flex-end;gap:.6rem;padding-top:.35rem}@media(max-width:760px){.tm-root{padding:1rem}.tm-header{align-items:flex-start;flex-direction:column}.tm-table th:nth-child(4),.tm-table td:nth-child(4){display:none}.tm-table th,.tm-table td{padding:.75rem .7rem}}
`;

function initials(name: string): string {
  const parts = name.trim().split(/\\s+/).filter(Boolean);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0]?.slice(0, 2) || "TM").toUpperCase();
}
function formatLastActive(value: string | null, status: Employee["status"]): string {
  if (!value || status === "invited") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function TeamPage() {
  const [employees,setEmployees]=useState<Employee[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[menuId,setMenuId]=useState<number|null>(null),[inviteOpen,setInviteOpen]=useState(false);
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[role,setRole]=useState<Employee["role"]>("staff"),[inviteLink,setInviteLink]=useState("");
  const [permissionEmployee,setPermissionEmployee]=useState<Employee|null>(null),[permissionCatalog,setPermissionCatalog]=useState<{key:string;name:string;group:string}[]>([]),[permissionKeys,setPermissionKeys]=useState<string[]>([]);
  const activeCount=useMemo(()=>employees.filter(e=>e.status==="active").length,[employees]);

  async function loadTeam(){setLoading(true);setError("");try{const r=await apiRequest<ApiResponse>("/team");setEmployees(Array.isArray(r.data)?r.data:[])}catch(e){setError(e instanceof Error?e.message:"Could not load the team.")}finally{setLoading(false)}}
  useEffect(()=>{void loadTeam()},[]);
  useEffect(()=>{if(!notice)return;const t=window.setTimeout(()=>setNotice(""),3500);return()=>window.clearTimeout(t)},[notice]);
  function closeInvite(){setInviteOpen(false);setName("");setEmail("");setRole("staff");setInviteLink("")}

  async function inviteEmployee(){
    if(!name.trim()||!email.trim()){setError("Enter the employee's name and email.");return}
    setSaving(true);setError("");
    try{const r=await apiRequest<ApiResponse>("/team/invite",{method:"POST",body:JSON.stringify({name:name.trim(),email:email.trim(),role})});setInviteLink(r.invitation_url||"");setNotice(r.email_sent===false?"Invitation created, but the email could not be sent.":"Invitation sent.");await loadTeam()}catch(e){setError(e instanceof Error?e.message:"Could not invite that employee.")}finally{setSaving(false)}
  }
  async function changeRole(employee:Employee,nextRole:Employee["role"]){
    if(employee.role===nextRole)return;setSaving(true);setError("");
    try{await apiRequest("/team/"+employee.id+"/role",{method:"PATCH",body:JSON.stringify({role:nextRole})});setNotice(employee.name+"'s role was updated.");await loadTeam()}catch(e){setError(e instanceof Error?e.message:"Could not update the role.")}finally{setSaving(false);setMenuId(null)}
  }
  async function runAction(employee:Employee,action:"deactivate"|"reactivate"|"resend"){
    setSaving(true);setError("");try{
      const path=action==="deactivate"?"/team/"+employee.id+"/deactivate":action==="reactivate"?"/team/"+employee.id+"/reactivate":"/team/"+employee.id+"/resend-invitation";
      const r=await apiRequest<ApiResponse>(path,{method:action==="resend"?"POST":"PATCH"});
      setNotice(r.email_sent===false?"Invitation refreshed, but the email could not be sent.":r.message||"Done.");if(r.invitation_url)setInviteLink(r.invitation_url);await loadTeam()
    }catch(e){setError(e instanceof Error?e.message:"That action could not be completed.")}finally{setSaving(false);setMenuId(null)}
  }
  async function openPermissions(employee:Employee){
    setSaving(true); setError("");
    try { const [catalog,user] = await Promise.all([apiRequest<any>("/permissions"),apiRequest<any>("/team/"+employee.id+"/permissions")]); setPermissionCatalog(catalog?.permissions??[]); setPermissionKeys(user?.permissions??[]); setPermissionEmployee(employee); }
    catch(e){ setError(e instanceof Error?e.message:"Could not load permissions."); } finally { setSaving(false); }
  }
  async function togglePermission(key:string){
    if(!permissionEmployee)return; setSaving(true); setError(""); const granted=!permissionKeys.includes(key);
    try { const r:any=await apiRequest("/team/"+permissionEmployee.id+"/permissions",{method:"PATCH",body:JSON.stringify({permission:key,granted})}); setPermissionKeys(r?.permissions??[]); setNotice("Permission updated."); }
    catch(e){setError(e instanceof Error?e.message:"Could not update permission.");} finally {setSaving(false);}
  }
  async function copyInviteLink(){if(!inviteLink)return;try{await navigator.clipboard.writeText(inviteLink);setNotice("Invitation link copied.")}catch{setError("Could not copy the invitation link. You can select it manually.")}}

  return <DashboardLayout><div className="tm-root"><style>{styles}</style><div className="tm-shell">
    <header className="tm-header"><div><span className="tm-eyebrow"><Users/> Settings · Team</span><h1 className="tm-title">Team</h1><p className="tm-subtitle">Manage the people who work in your organization. Employee accounts are kept when deactivated so their historical activity stays attached to them.</p></div><button className="tm-btn tm-btn--primary" type="button" onClick={()=>{setError("");setInviteOpen(true)}}><UserPlus/> Invite employee</button></header>
    {error&&<div className="tm-alert"><AlertCircle/><span>{error}</span></div>}{notice&&<div className="tm-alert tm-alert--ok"><CheckCircle2/><span>{notice}</span></div>}
    <section className="tm-panel"><div className="tm-panel__head"><h2 className="tm-panel__title"><Shield/> Employee accounts</h2><span className="tm-meta">{activeCount} active · {employees.length} total</span></div>
      {loading?<div className="tm-empty"><RefreshCw/> Loading team…</div>:employees.length===0?<div className="tm-empty"><Users/><div>No employees yet.</div><div>Invite your first employee to start building the team.</div></div>:
      <div style={{overflowX:"auto"}}><table className="tm-table"><thead><tr><th>Employee</th><th>Role</th><th>Status</th><th>Last active</th><th aria-label="Actions"/></tr></thead><tbody>
      {employees.map(employee=><tr key={employee.id}><td><div className="tm-person"><span className="tm-avatar">{initials(employee.name)}</span><div><div className="tm-name">{employee.name}</div><div className="tm-email">{employee.email}</div></div></div></td>
      <td><select value={employee.role} disabled={saving} aria-label={"Role for "+employee.name} onChange={e=>void changeRole(employee,e.target.value as Employee["role"])} style={{border:"1px solid #e1e6e9",borderRadius:".55rem",padding:".45rem .55rem",background:"#fff",color:"#34404c",fontSize:".75rem"}}><option value="property_manager">Property Manager</option><option value="staff">Staff</option></select></td>
      <td><span className={"tm-pill tm-pill--"+employee.status}>{STATUS_LABELS[employee.status]}</span></td><td>{formatLastActive(employee.last_active_at,employee.status)}</td>
      <td className="tm-actions"><div className="tm-menu-wrap"><button className="tm-menu-button" type="button" aria-label={"Actions for "+employee.name} onClick={()=>setMenuId(menuId===employee.id?null:employee.id)}><MoreVertical/></button>
      {menuId===employee.id&&<div className="tm-menu"><button type="button" onClick={()=>{setMenuId(null);void openPermissions(employee)}}>Permissions</button>{employee.status==="invited"&&<button type="button" onClick={()=>void runAction(employee,"resend")}>Resend invitation</button>}{employee.status==="deactivated"?<button type="button" onClick={()=>void runAction(employee,"reactivate")}>Reactivate employee</button>:employee.status!=="invited"&&<button className="danger" type="button" onClick={()=>void runAction(employee,"deactivate")}>Deactivate employee</button>}</div>}</div></td></tr>)}
      </tbody></table></div>}
    </section>
  </div></div>

  {permissionEmployee&&<div className="tm-overlay" role="dialog" aria-modal="true"><div className="tm-modal"><div className="tm-modal__head"><h2>Permissions · {permissionEmployee.name}</h2><button className="tm-menu-button" type="button" onClick={()=>setPermissionEmployee(null)}>×</button></div><div className="tm-modal__body"><p className="tm-hint">Operational permissions are enabled by default. Sensitive financial and administrative permissions can be granted individually by the owner or administrator.</p><div style={{display:"grid",gap:".45rem",maxHeight:"55vh",overflowY:"auto"}}>{permissionCatalog.map(p=><label key={p.key} style={{display:"flex",alignItems:"center",gap:".7rem",padding:".65rem",border:"1px solid #edf0f2",borderRadius:".65rem"}}><input type="checkbox" checked={permissionKeys.includes(p.key)} disabled={saving} onChange={()=>void togglePermission(p.key)}/><span><strong style={{display:"block",fontSize:".78rem"}}>{p.name}</strong><small style={{color:"#8a949d"}}>{p.group} · {p.key}</small></span></label>)}</div><div className="tm-modal__actions"><button className="tm-btn tm-btn--ghost" type="button" onClick={()=>setPermissionEmployee(null)}>Done</button></div></div></div></div>}
  {inviteOpen&&<div className="tm-overlay" role="dialog" aria-modal="true" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)closeInvite()}}><div className="tm-modal">
    <div className="tm-modal__head"><h2>Invite employee</h2><button className="tm-menu-button" type="button" onClick={closeInvite} disabled={saving} aria-label="Close">×</button></div>
    <div className="tm-modal__body"><div className="tm-field"><label htmlFor="employee-name">Full name</label><input id="employee-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Wanjiku" autoComplete="name"/></div>
    <div className="tm-field"><label htmlFor="employee-email">Email</label><input id="employee-email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@example.com" type="email" autoComplete="email"/></div>
    <div className="tm-field"><label htmlFor="employee-role">Role</label><select id="employee-role" value={role} onChange={e=>setRole(e.target.value as Employee["role"])}><option value="property_manager">Property Manager</option><option value="staff">Staff</option></select></div>
    <p className="tm-hint">The employee will receive a secure invitation link. They create their own password when they accept it.</p>
    {inviteLink&&<div className="tm-field"><label htmlFor="invitation-link">Invitation link</label><input id="invitation-link" value={inviteLink} readOnly onFocus={e=>e.currentTarget.select()}/><button className="tm-btn tm-btn--ghost" type="button" onClick={()=>void copyInviteLink()}>Copy link</button></div>}
    <div className="tm-modal__actions"><button className="tm-btn tm-btn--ghost" type="button" onClick={closeInvite} disabled={saving}>Close</button>{!inviteLink&&<button className="tm-btn tm-btn--primary" type="button" onClick={()=>void inviteEmployee()} disabled={saving}>{saving?"Sending…":"Send invitation"}</button>}</div>
    </div></div></div>}
  </DashboardLayout>
}
export default TeamPage;
