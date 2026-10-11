import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { Btn, Panel, inputCls } from "../../components/ui.jsx";

// The list of areas lodges can be placed in (also the public "Area" filter). Rename or delete here; lodges stay in sync.
export default function AdminAreas() {
  const [areas, setAreas] = useState([]);
  const [counts, setCounts] = useState({});
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null); // { id, name }
  const [error, setError] = useState("");

  async function load() {
    const [a, l] = await Promise.all([
      supabase.from("areas").select("id, name").order("name"),
      supabase.from("lodges").select("location"),
    ]);
    if (a.error) return setError("Could not load areas. Have you run v7-migration.sql?");
    setAreas(a.data);
    const c = {};
    (l.data ?? []).forEach((r) => { if (r.location) c[r.location.toLowerCase()] = (c[r.location.toLowerCase()] ?? 0) + 1; });
    setCounts(c);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    const n = name.trim();
    if (n.length < 2) return setError("Type the area's name.");
    const { error } = await supabase.from("areas").insert({ name: n });
    if (error) return setError(error.code === "23505" ? "That area already exists." : "Could not add it.");
    setName(""); load();
  }

  async function saveRename() {
    setError("");
    const { error } = await supabase.rpc("admin_rename_area", { p_id: editing.id, p_name: editing.name });
    if (error) return setError(error.code === "23505" ? "Another area already has that name." : "Could not rename it.");
    setEditing(null); load();
  }

  async function remove(a) {
    setError("");
    if (!confirm(`Delete the area "${a.name}"?`)) return;
    const { data, error } = await supabase.rpc("admin_delete_area", { p_id: a.id });
    if (error) return setError("Could not delete it.");
    if (data === "in_use") return setError("Lodges still use that area. Move them to another area first.");
    load();
  }

  return (
    <>
      <h1 className="font-display text-[1.9rem] leading-tight">Areas</h1>
      <p className="mt-1 text-[0.92rem] text-muted">Lodges are placed in one of these areas, and visitors can filter by them.</p>
      <Panel className="mt-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-60 grow flex-col gap-1 text-[0.85rem] font-bold">
            New area
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gidan Kwano" />
          </label>
          <Btn type="submit" as="button" variant="primary">Add area</Btn>
        </form>
        {error && <p className="mt-3 text-booked" role="alert">{error}</p>}
      </Panel>
      <div className="mt-4 grid gap-2.5">
        {areas.length === 0 && <p className="py-4 text-muted">No areas yet.</p>}
        {areas.map((a) => {
          const used = counts[a.name.toLowerCase()] ?? 0;
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3">
              {editing?.id === a.id ? (
                <input className={inputCls + " max-w-72"} value={editing.name} autoFocus
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditing(null); }} />
              ) : (
                <strong className="min-w-32 grow">{a.name}</strong>
              )}
              <span className="text-[0.85rem] text-muted">{used} lodge{used === 1 ? "" : "s"}</span>
              {editing?.id === a.id ? (
                <>
                  <Btn as="button" size="sm" variant="primary" onClick={saveRename}>Save</Btn>
                  <Btn as="button" size="sm" onClick={() => setEditing(null)}>Cancel</Btn>
                </>
              ) : (
                <>
                  <Btn as="button" size="sm" onClick={() => setEditing({ id: a.id, name: a.name })}>Rename</Btn>
                  <Btn as="button" size="sm" variant="danger" disabled={used > 0} onClick={() => remove(a)}>Delete</Btn>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
