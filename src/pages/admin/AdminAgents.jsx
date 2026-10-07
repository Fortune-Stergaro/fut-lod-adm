import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { Btn, Panel, inputCls, labelCls } from "../../components/ui.jsx";

const blank = { name: "", whatsapp: "", email: "" };

// Turn a Supabase error into something that points at the cause.
function explain(error) {
  if (!error) return "";
  const code = error.code ?? "";
  const status = error.status ?? "";
  let hint = "";
  if (code === "PGRST205" || code === "42P01" || status === 404)
    hint = "The API can't see an 'agents' table. Either this site's .env points at a different Supabase project than the one you ran the SQL in, or the API schema cache is stale (run: notify pgrst, 'reload schema';).";
  else if (code === "42501" || status === 401 || status === 403)
    hint = "Permission denied. The row-level security policy or grants for 'agents' are missing. Re-run supabase/v2-migration.sql.";
  else if (code === "23505")
    hint = "Another agent already uses that email.";
  else if (code === "23502" || code === "23514")
    hint = "A required value is missing or invalid.";
  return `${[code, status].filter(Boolean).join(" / ")}: ${error.message}${hint ? `\n→ ${hint}` : ""}`;
}

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  // Which project is this site actually talking to?
  const url = import.meta.env.VITE_SUPABASE_URL;
  const host = url ? new URL(url).host : "(VITE_SUPABASE_URL is missing)";

  const load = async () => {
    const { data, error } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("[agents] load failed:", error);
      setLoadError(explain(error));
      return;
    }
    setLoadError("");
    setAgents(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setEditing(null); setForm(blank); setError(""); };

  async function submit(e) {
    e.preventDefault();
    setError("");
    const row = { name: form.name.trim(), whatsapp: form.whatsapp.replace(/[\s-]/g, ""), email: form.email.trim().toLowerCase() || null };
    if (row.name.length < 2) return setError("Enter the agent's name.");
    if (!/^\+?\d{10,14}$/.test(row.whatsapp)) return setError("Enter a valid WhatsApp number.");
    if (row.email && !/^\S+@\S+\.\S+$/.test(row.email)) return setError("That email doesn't look right.");

    setBusy(true);
    const { error } = editing
      ? await supabase.from("agents").update(row).eq("id", editing.id)
      : await supabase.from("agents").insert(row);
    setBusy(false);
    if (error) {
      console.error("[agents] save failed:", error, "row:", row);
      return setError(explain(error));
    }
    reset(); load();
  }

  async function remove(a) {
    if (!confirm(`Delete ${a.name}? Lodges using this agent will have no agent attached.`)) return;
    const { error } = await supabase.from("agents").delete().eq("id", a.id);
    if (error) {
      console.error("[agents] delete failed:", error);
      return setError(explain(error));
    }
    if (editing?.id === a.id) reset();
    load();
  }

  const diag = "whitespace-pre-wrap text-[0.85rem] text-booked";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Panel>
        <form onSubmit={submit} className="grid content-start gap-4">
          <h2 className="font-display text-xl">{editing ? "Edit agent" : "Add an agent"}</h2>
          <p className="text-[0.92rem] text-muted">Connected to: <code className="rounded bg-line-soft px-1.5 py-0.5 text-[0.85em]">{host}</code></p>
          <label className={labelCls}>Name<input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className={labelCls}>WhatsApp number<input className={inputCls} inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="08012345678" /></label>
          <label className={labelCls}>Email
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <span className="text-[0.85rem] font-normal text-muted">Optional. Needed if this agent should sign in and add lodges themselves: they sign in with this exact email.</span>
          </label>
          {error && <p className={diag} role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2.5">
            <Btn variant="primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add agent"}</Btn>
            {editing && <Btn type="button" onClick={reset}>Cancel</Btn>}
          </div>
        </form>
      </Panel>
      <section>
        <h2 className="font-display text-xl">Agents ({agents.length})</h2>
        {loadError && <p className={diag} role="alert">Could not load agents. {loadError}</p>}
        {!loadError && agents.length === 0 && <p className="py-8 text-muted">No agents yet. Add one so you can attach them to lodges.</p>}
        <div className="mt-4 grid gap-4">
          {agents.map((a) => (
            <Panel key={a.id}>
              <h3 className="font-display text-lg"><Link to={`/admin/agents/${a.id}`} className="underline">{a.name}</Link></h3>
              <p className="mt-1 text-[0.92rem] text-muted">WhatsApp {a.whatsapp}{a.email ? ` · ${a.email}` : " · no email (can't sign in to the portal)"}</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <Btn size="sm" onClick={() => { setEditing(a); setForm({ name: a.name, whatsapp: a.whatsapp, email: a.email ?? "" }); setError(""); }}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={() => remove(a)}>Delete</Btn>
              </div>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
