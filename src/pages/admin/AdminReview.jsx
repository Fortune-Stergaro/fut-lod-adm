import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import LodgeForm from "../../components/LodgeForm.jsx";
import { Panel, Tag } from "../../components/ui.jsx";

// Edit an agent's submission, then approve (publish) or reject it.
export default function AdminReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lodge, setLodge] = useState(undefined);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents] = useState([]);
  const [formKey, setFormKey] = useState(0);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [l, c, a] = await Promise.all([
      supabase.rpc("admin_lodges"),
      supabase.from("stat_categories").select("*").order("name"),
      supabase.from("agents").select("id, name").order("name"),
    ]);
    setLodge((l.data ?? []).find((x) => x.id === id) ?? null);
    setCategories(c.data ?? []);
    setAgents(a.data ?? []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (lodge === undefined) return <p className="py-8 text-muted">Loading…</p>;
  if (!lodge) return <p className="py-8 text-muted">Lodge not found. <Link to="/admin/requests" className="underline">Back to requests</Link></p>;

  async function onSave(row, key) {
    if (key === "reject") {
      const note = prompt("Why are you rejecting this lodge? The agent will see this note.");
      if (note === null) return null;
      if (note.trim().length < 3) return "Write a short note so the agent knows what to fix.";
      const { error } = await supabase.rpc("admin_review_lodge", { p_id: id, p_decision: "rejected", p_note: note });
      if (error) return error.message;
      navigate("/admin/requests");
      return null;
    }
    const { error } = await supabase.from("lodges").update(row).eq("id", id);
    if (error) return error.message;
    if (key === "approve") {
      const { error: e2 } = await supabase.rpc("admin_review_lodge", { p_id: id, p_decision: "approved", p_note: null });
      if (e2) return e2.message;
      navigate("/admin/lodges");
      return null;
    }
    setNotice("Changes saved.");
    setFormKey((k) => k + 1);
    await load();
    return null;
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <Link to="/admin/requests" className="mb-3 inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">← All requests</Link>
      <Panel>
        <LodgeForm
          key={formKey} mode="admin" initial={lodge} agents={agents} categories={categories} onCategoriesChanged={load}
          onSave={onSave} canDeleteVideos title="Review lodge"
          actions={[
            { key: "approve", label: "Save and approve", variant: "primary" },
            { key: "save", label: "Save changes" },
            { key: "reject", label: "Reject…", variant: "danger" },
          ]}
          top={<>
            <div className="flex flex-wrap items-center gap-2 text-[0.92rem] text-muted">
              <Tag tone={lodge.review_status === "pending" ? "sold" : lodge.review_status === "approved" ? "free" : "booked"} pill>{lodge.review_status}</Tag>
              Sent by {lodge.agent_id ? <Link to={`/admin/agents/${lodge.agent_id}`} className="font-bold text-ink underline">{lodge.agent_name}</Link> : "no agent"}
            </div>
            {lodge.rejection_note && <p className="rounded-lg bg-booked-soft px-3 py-2.5 text-[0.92rem] text-booked"><strong>Previous rejection note:</strong> {lodge.rejection_note}</p>}
            {notice && <p className="font-bold text-green" role="status">{notice}</p>}
          </>}
        />
      </Panel>
    </div>
  );
}
