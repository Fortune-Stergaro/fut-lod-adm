import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { markPendingPassword, useAuth } from "../lib/AuthContext.jsx";
import { Btn, LinkBtn, Modal, inputCls, labelCls } from "./ui.jsx";

// Sign in with email + password.
// New accounts (or password resets): we email a verification link (sent by Supabase Auth);
// after clicking it the person comes back and chooses a password.
export default function AuthModal({ onClose, onSuccess, reason }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | email | sent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // They clicked the link in another tab: close this one
  useEffect(() => { if (user && mode === "sent") onClose(); }, [user, mode, onClose]);

  const go = (m) => { setMode(m); setError(""); };
  const run = async (fn) => { setBusy(true); setError(""); try { await fn(); } finally { setBusy(false); } };

  const signIn = (e) => { e.preventDefault(); run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("Wrong email or password."); else onSuccess();
  }); };

  const sendLink = (e) => { e?.preventDefault(); run(async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.href },
    });
    if (error) return setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "Could not send the email. Check the address and try again.");
    markPendingPassword(email);
    setCooldown(60);
    setMode("sent");
  }); };

  const form = "grid gap-3.5";
  const h2 = "font-display text-xl";
  const note = "text-[0.92rem] text-muted";
  const switchLine = "text-[0.85rem] text-muted";

  const emailField = (
    <label className={labelCls}>Email
      <input className={inputCls} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
    </label>
  );
  const err = error && <p className="text-booked" role="alert">{error}</p>;

  return (
    <Modal label="Sign in" onClose={onClose}>
      {mode === "signin" && (
        <form className={form} onSubmit={signIn}>
          <h2 className={h2}>Sign in</h2>
          {reason && <p className={note}>{reason}</p>}
          {emailField}
          <label className={labelCls}>Password
            <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {err}
          <Btn variant="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Btn>
          <p className={switchLine}>
            New here? <LinkBtn onClick={() => go("email")}>Create an account</LinkBtn>
            {" · "}<LinkBtn onClick={() => go("email")}>Forgot password?</LinkBtn>
          </p>
        </form>
      )}

      {mode === "email" && (
        <form className={form} onSubmit={sendLink}>
          <h2 className={h2}>Create an account</h2>
          <p className={note}>Enter your email and we'll send you a verification link (sent by Supabase Auth, the service that handles sign-in for this site). Click it, then choose a password. Forgot your password? Do the same to set a new one.</p>
          {emailField}
          {err}
          <Btn variant="primary" disabled={busy}>{busy ? "Sending…" : "Send verification link"}</Btn>
          <p className={switchLine}><LinkBtn onClick={() => go("signin")}>Back to sign in</LinkBtn></p>
        </form>
      )}

      {mode === "sent" && (
        <div className={form}>
          <h2 className={h2}>Check your email</h2>
          <p className={note}>We've sent a verification link to <strong className="text-ink">{email.trim()}</strong>. Open your email and click the link to verify it. You'll come back to this site to set your password.</p>
          <p className={note}>The email comes from <strong className="text-ink">Supabase Auth</strong>, our sign-in provider, so look for a message from Supabase. If you don't see it, check your spam or junk folder.</p>
          {err}
          <Btn disabled={cooldown > 0 || busy} onClick={() => sendLink()}>
            {cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend the link"}
          </Btn>
          <p className={switchLine}><LinkBtn onClick={() => go("email")}>Use a different email</LinkBtn></p>
        </div>
      )}
    </Modal>
  );
}
