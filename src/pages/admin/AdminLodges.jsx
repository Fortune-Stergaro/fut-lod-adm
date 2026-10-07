import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { naira, lodgeTitle } from "../../lib/constants.js";
import { removeVideo } from "../../lib/video.js";
import LodgeForm from "../../components/LodgeForm.jsx";
import { Btn, Panel, Tag } from "../../components/ui.jsx";

// Live (approved) lodges. New agent submissions are reviewed under "Lodge requests".
export default function AdminLodges() {
  const [lodges, setLodges] = useState([]);
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [l, a, c] = await Promise.all([
      supabase.rpc("admin_lodges"),
      supabase.from("agents").select("id, name").order("name"),
      supabase.from("stat_categories").select("*").order("name"),
    ]);
    setLodges((l.data ?? []).filter((x) => x.review_status === "approved"));
    setAgents(a.data ?? []);
    setCategories(c.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const edit = (l) => { setEditing(l); setFormKey((k) => k + 1); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const stopEditing = () => { setEditing(null); setFormKey((k) => k + 1); };

  async function onSave(row) {
    const { error } = editing
      ? await supabase.from("lodges").update(row).eq("id", editing.id)
      : await supabase.from("lodges").insert(row);
    if (error) return error.message;
    setNotice(editing ? "Changes saved." : "Lodge added.");
    stopEditing();
    await load();
    return null;
  }

  async function remove(l) {
    if (!confirm(`Delete "${lodgeTitle(l)}"? Its video and all interest and booking records will be removed for good.`)) return;
    const { error } = await supabase.from("lodges").delete().eq("id", l.id);
    if (error) return setError("Could not delete that lodge.");
    await removeVideo(l.video_url);
    if (editing?.id === l.id) stopEditing();
    setNotice("Lodge deleted.");
    load();
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Panel className="lg:sticky lg:top-[calc(var(--header-h,64px)+1rem)] lg:max-h-[calc(100vh-var(--header-h,64px)-2rem)] lg:overflow-auto">
        <LodgeForm key={formKey} mode="admin" initial={editing} agents={agents} categories={categories}
          onCategoriesChanged={load} onSave={onSave} canDeleteVideos
          title={editing ? "Edit lodge" : "Add a lodge"} onCancel={editing ? stopEditing : undefined} />
        {notice && <p className="mt-3 font-bold text-green" role="status">{notice}</p>}
        {error && <p className="mt-3 text-booked" role="alert">{error}</p>}
      </Panel>

      <section>
        <h2 className="font-display text-xl">Live lodges ({lodges.length})</h2>
        {loading && <p className="py-8 text-muted">Loading…</p>}
        {!loading && lodges.length === 0 && <p className="py-8 text-muted">No lodges yet. Add your first one.</p>}
        <div className="mt-4 grid gap-4">
          {lodges.map((l) => (
            <Panel key={l.id} pad="xs" accent={editing?.id === l.id ? "premium" : "default"} className="grid gap-4 sm:grid-cols-[180px_1fr]">
              {l.video_url
                ? <video src={l.video_url} muted playsInline preload="metadata" className="aspect-[4/3] w-full rounded-[10px] object-cover" />
                : <div className="grid aspect-[4/3] w-full place-items-center rounded-[10px] bg-[#17302a] text-[0.9rem] text-mint">No video</div>}
              <div>
                <h3 className="font-display text-[1.1rem]">{lodgeTitle(l)}</h3>
                <p className="mt-1 text-[0.92rem] text-muted">
                  {l.lodge_name ? `${l.name} · ` : ""}{l.location ? `${l.location} · ` : ""}{l.rooms} room{l.rooms > 1 ? "s" : ""} · {naira(l.price_yearly)}/yr ({naira(l.price_first_year)} first year)
                </p>
                <p className="mt-1 text-[0.92rem] text-muted">
                  Agent: {l.agent_id ? <Link to={`/admin/agents/${l.agent_id}`} className="font-bold text-ink underline">{l.agent_name}</Link> : "none attached"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Tag tone={l.units_available === 0 ? "booked" : "free"}>{l.units_available} of {l.units_total} available</Tag>
                  <Tag>{l.booked_count} booked</Tag>
                  {l.sold_count > 0 && <Tag tone="sold">{l.sold_count} sold</Tag>}
                  <Tag>{l.interest_count} interested</Tag>
                  {l.source === "agent" && <Tag>Added by agent</Tag>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <Btn size="sm" onClick={() => edit(l)}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={() => remove(l)}>Delete</Btn>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
