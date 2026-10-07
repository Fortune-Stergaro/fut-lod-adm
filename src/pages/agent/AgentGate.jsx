import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import AuthModal from "../../components/AuthModal.jsx";
import { Btn, Panel, cx } from "../../components/ui.jsx";

// Everything under /agent needs a signed-in user whose email is registered as an agent.
export default function AgentGate() {
  const { user, loading, agent } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading || (user && agent === undefined)) return <p className="py-8 text-muted">Loading…</p>;

  if (!user) {
    return (
      <Panel className="mx-auto my-8 grid max-w-[400px] content-start gap-4">
        <h1 className="font-display text-2xl">Agent portal</h1>
        <p className="text-[0.92rem] text-muted">Sign in with the email you're registered with as an agent.</p>
        <Btn variant="primary" onClick={() => setAuthOpen(true)}>Sign in</Btn>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />}
      </Panel>
    );
  }
  if (!agent) {
    return (
      <Panel className="mx-auto my-8 grid max-w-[460px] content-start gap-3">
        <h1 className="font-display text-2xl">Not registered as an agent</h1>
        <p className="text-[0.92rem] text-muted">{user.email} isn't registered as an agent. Ask the site owner to register this email.</p>
      </Panel>
    );
  }

  const link = ({ isActive }) =>
    cx("flex min-h-11 items-center rounded-lg border px-4 font-bold no-underline", isActive ? "border-ink bg-ink text-white" : "border-line bg-white");
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <NavLink to="/agent" end className={link}>My lodges</NavLink>
        <NavLink to="/agent/new" className={link}>Add a lodge</NavLink>
        <span className="ml-auto text-[0.9rem] text-muted">Agent: <strong className="text-ink">{agent.name}</strong></span>
      </div>
      <Outlet context={{ agent }} />
    </>
  );
}
