import { useState } from "react";
import { STATUSES } from "../lib/constants.js";
import StatBadge from "./StatBadge.jsx";
import { Btn, LinkBtn, labelCls, inputCls, selectCls, statChip } from "./ui.jsx";

// Type a stat; pick it from the known categories or add a new one.
// A new stat is only added to this lodge; the owner turns it into a category when approving.
export default function StatEditor({ stats, onChange, categories }) {
  const [q, setQ] = useState("");
  const [newStatus, setNewStatus] = useState("convenient");
  const [error, setError] = useState("");

  const name = q.trim().replace(/\s+/g, " ");
  const lower = name.toLowerCase();
  const added = new Set(stats.map((s) => s.name.toLowerCase()));
  const exact = categories.find((c) => c.name.toLowerCase() === lower);
  const suggestions = categories.filter((c) => !added.has(c.name.toLowerCase()) && (!lower || c.name.toLowerCase().includes(lower)));

  const add = (c) => { onChange([...stats, { name: c.name, status: c.status, available: true }]); setQ(""); setError(""); };
  const patch = (i, p) => onChange(stats.map((s, j) => (j === i ? { ...s, ...p } : s)));

  function createAndAdd() {
    setError("");
    if (name.length < 2) return setError("Type the stat's name first.");
    if (added.has(lower)) return setError("Already added to this lodge.");
    add({ name, status: newStatus });
  }

  function onKey(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!name) return;
    if (added.has(lower)) return setError("Already added to this lodge.");
    if (exact) return add(exact);
    setError(`Not in the list yet. Pick a status and click “Add”.`);
  }

  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[0.85rem] font-bold">Stats</legend>

      {stats.length > 0 && (
        <div className="grid gap-1.5">
          {stats.map((s, i) => (
            <div key={s.name} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2">
              <StatBadge status={s.status} />
              <span className="min-w-[120px] flex-1 font-bold">{s.name}</span>
              <label className="flex flex-row items-center gap-1.5 text-[0.85rem] font-medium">
                <input type="checkbox" className="accent-green" checked={s.available} onChange={(e) => patch(i, { available: e.target.checked })} />
                {s.available ? "Available" : "Not available"}
              </label>
              <LinkBtn className="text-[0.85rem] text-muted" onClick={() => onChange(stats.filter((_, j) => j !== i))} aria-label={`Remove ${s.name}`}>Remove</LinkBtn>
            </div>
          ))}
        </div>
      )}

      <label className={labelCls}>Add a stat
        <input className={inputCls} value={q} onChange={(e) => { setQ(e.target.value); setError(""); }} onKeyDown={onKey} placeholder="Type e.g. stable electricity" />
      </label>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Known categories">
          {suggestions.map((c) => (
            <button key={c.id} type="button" className={statChip(c.status, false)} onClick={() => add(c)}>+ {c.name}</button>
          ))}
        </div>
      )}

      {name.length >= 2 && !exact && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg bg-paper px-3 py-2.5 text-[0.9rem]">
          <span>“{name}” isn't a category yet.</span>
          <select className={selectCls} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} aria-label="Status for the new stat">
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <Btn type="button" size="sm" onClick={createAndAdd}>Add</Btn>
        </div>
      )}
      {exact && added.has(lower) && <p className="m-0 text-[0.92rem] text-muted">“{exact.name}” is already on this lodge.</p>}
      {error && <p className="m-0 text-booked" role="alert">{error}</p>}
    </fieldset>
  );
}
