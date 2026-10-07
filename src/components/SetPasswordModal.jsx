import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { Btn, LinkBtn, Modal, inputCls, labelCls } from "./ui.jsx";

// Shown after someone clicks the email verification link and lands back on the site signed in.
export default function SetPasswordModal() {
  const { passwordSet } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError("Could not save the password. Try again.");
    passwordSet();
  }

  return (
    <Modal label="Set your password" onClose={() => {}}>
      <form className="grid gap-3.5" onSubmit={save}>
        <h2 className="font-display text-xl">Email verified. Set your password</h2>
        <p className="text-[0.92rem] text-muted">Choose a password so you can sign in quickly next time.</p>
        <label className={labelCls}>Password
          <input className={inputCls} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </label>
        <label className={labelCls}>Confirm password
          <input className={inputCls} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        {error && <p className="text-booked" role="alert">{error}</p>}
        <Btn variant="primary" disabled={busy}>{busy ? "Saving…" : "Save password"}</Btn>
        <p className="text-[0.85rem] text-muted"><LinkBtn onClick={passwordSet}>Skip for now</LinkBtn></p>
      </form>
    </Modal>
  );
}
