import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Lock, Mail } from "lucide-react";
import { ApiError, apiRequest } from "../services/api";

function PasswordResetPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const emailFromLink = params.get("email") ?? "";
  const isReset = Boolean(token && emailFromLink);

  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validEmail = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!validEmail) {
      setError("Enter a valid email address.");
      return;
    }

    if (isReset && password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (isReset && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = isReset
        ? await apiRequest("/password/reset", {
            method: "POST",
            body: JSON.stringify({
              email,
              token,
              password,
              password_confirmation: confirmation,
            }),
          })
        : await apiRequest("/password/forgot", {
            method: "POST",
            body: JSON.stringify({ email }),
          });

      const text = response && typeof response === "object" && "message" in response
        ? String((response as Record<string, unknown>).message)
        : isReset
        ? "Password reset successfully."
        : "If an account exists for that email, a password reset link has been sent.";

      setMessage(text);
      if (isReset) {
        window.setTimeout(() => navigate("/login", { replace: true }), 1600);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"1.5rem",background:"#030712",color:"#f8fafc",fontFamily:"system-ui,-apple-system,Segoe UI,sans-serif"}}>
      <section style={{width:"100%",maxWidth:"28rem",padding:"2rem",borderRadius:"1.25rem",background:"rgba(15,23,42,.82)",border:"1px solid rgba(255,255,255,.1)"}}>
        <div style={{width:"2.75rem",height:"2.75rem",display:"grid",placeItems:"center",borderRadius:".85rem",background:"rgba(59,130,246,.15)",color:"#93c5fd",marginBottom:"1rem"}}>
          {isReset ? <Lock size={20}/> : <Mail size={20}/>}
        </div>
        <h1 style={{margin:"0 0 .5rem",fontSize:"1.4rem"}}>{isReset ? "Set a new password" : "Forgot your password?"}</h1>
        <p style={{margin:"0 0 1.5rem",color:"#94a3b8",lineHeight:1.5}}>
          {isReset
            ? "Choose a new password for your account."
            : "Enter your account email and we'll send you a secure password reset link."}
        </p>

        {error && <div style={{display:"flex",gap:".5rem",padding:".75rem",marginBottom:"1rem",borderRadius:".7rem",background:"rgba(248,113,113,.12)",color:"#fca5a5"}}><AlertCircle size={17}/><span>{error}</span></div>}
        {message && <div style={{display:"flex",gap:".5rem",padding:".75rem",marginBottom:"1rem",borderRadius:".7rem",background:"rgba(74,222,128,.12)",color:"#86efac"}}><CheckCircle2 size={17}/><span>{message}</span></div>}

        <form onSubmit={submit} style={{display:"grid",gap:"1rem"}}>
          <label style={{display:"grid",gap:".4rem"}}>
            <span>Email</span>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" autoComplete="email" disabled={isReset} style={{padding:".8rem",borderRadius:".7rem",border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.04)",color:"#fff"}} />
          </label>

          {isReset && <>
            <label style={{display:"grid",gap:".4rem"}}>
              <span>New password</span>
              <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" autoComplete="new-password" style={{padding:".8rem",borderRadius:".7rem",border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.04)",color:"#fff"}} />
            </label>
            <label style={{display:"grid",gap:".4rem"}}>
              <span>Confirm new password</span>
              <input value={confirmation} onChange={(e)=>setConfirmation(e.target.value)} type="password" autoComplete="new-password" style={{padding:".8rem",borderRadius:".7rem",border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.04)",color:"#fff"}} />
            </label>
          </>}

          <button type="submit" disabled={loading} style={{padding:".85rem 1rem",border:0,borderRadius:".7rem",background:"#2563eb",color:"#fff",fontWeight:700,cursor:"pointer"}}>
            {loading ? "Please wait…" : isReset ? "Reset password" : "Send reset link"}
          </button>
        </form>

        <button type="button" onClick={()=>navigate("/login")} style={{width:"100%",marginTop:"1rem",padding:".6rem",border:0,background:"transparent",color:"#93c5fd",cursor:"pointer"}}>
          Back to sign in
        </button>
      </section>
    </main>
  );
}

export default PasswordResetPage;
