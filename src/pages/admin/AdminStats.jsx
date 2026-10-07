import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { STATUSES } from "../../lib/constants.js";
import StatBadge from "../../components/StatBadge.jsx";
import { Btn, Panel, inputCls, labelCls, selectCls } from "../../components/ui.jsx";

export default function AdminStats() {
  const [cats, setCats] = useState([]);
  const [counts, setCounts] = useState({});
  const [name, setName] = useState("");
  const [status, setStatus] = useState("convenient");
  const [error, setError] = useState("");

  const load = async () => {
    const [c, l] = await Promise.all([
      supabase.from("stat_categories").select("*").order("name"),
      supabase.from("lodges").select("stats"),
    ]);
    setCats(c.data ?? []);
    const m = {};
    (l.data ?? []).forEach((r) => (r.stats ?? []).forEach((s) => { const k = s.name.toLowerCase(); m[k] = (m[k] || 0) + 1; }));
    setCounts(m);
  };
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Enter a name.");
    const { error } = await supabase.from("stat_categories").insert({ name: name.trim(), status });
    if (error) return setError(error.code === "23505" ? "That category already exists." : "Could not add it.");
    setName(""); load();
  }
  async function update(c, nextName, nextStatus) {
    setError("");
    const { error } = await supabase.rpc("admin_update_category", { p_id: c.id, p_name: nextName, p_status: nextStatus });
    if (error) setError("Could not update that category."); else load();
  }
  const rename = (c) => { const n = prompt("New name", c.name); if (n && n.trim().length >= 2) update(c, n.trim(), c.status); };
  async function remove(c) {
    if (!confirm(`Remove "${c.name}" from the list? Lodges that already have it keep it.`)) return;
    await supabase.from("stat_categories").delete().eq("id", c.id);
    load();
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Panel>
        <form onSubmit={add} className="grid content-start gap-4">
          <h2 className="font-display text-xl">Add a category</h2>
          <p className="text-[0.92rem] text-muted">Categories are suggestions when you add stats to a lodge. You can also create them while adding a lodge.</p>
          <label className={labelCls}>Name<input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tiled floors" /></label>
          <label className={labelCls}>Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          {error && <p className="text-booked" role="alert">{error}</p>}
          <Btn variant="primary">Add category</Btn>
        </form>
      </Panel>
      <section>
        <h2 className="font-display text-xl">Categories ({cats.length})</h2>
        <div className="mt-4 grid gap-4">
          {cats.map((c) => (
            <Panel key={c.id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <strong>{c.name}</strong> <StatBadge status={c.status} />
                <p className="text-[0.92rem] text-muted">Used on {counts[c.name.toLowerCase()] ?? 0} lodge(s)</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <select className={selectCls} value={c.status} onChange={(e) => update(c, c.name, e.target.value)} aria-label={`Status for ${c.name}`}>
                  {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <Btn size="sm" onClick={() => rename(c)}>Rename</Btn>
                <Btn size="sm" variant="danger" onClick={() => remove(c)}>Remove</Btn>
              </div>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
