import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import LodgeForm from "../../components/LodgeForm.jsx";
import { Panel } from "../../components/ui.jsx";

// /agent/new (submit a lodge) and /agent/edit/:id (edit and resend a rejected one)
export default function AgentLodgeForm() {
  const { agent } = useOutletContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [lodge, setLodge] = useState(id ? undefined : null);

  useEffect(() => {
    supabase.from("stat_categories").select("*").order("name").then(({ data }) => setCategories(data ?? []));
    if (id) supabase.rpc("agent_lodges").then(({ data }) => setLodge((data ?? []).find((l) => l.id === id) ?? null));
  }, [id]);

  if (id && lodge === undefined) return <p className="py-8 text-muted">Loading…</p>;
  if (id && (!lodge || lodge.review_status !== "rejected"))
    return <p className="py-8 text-muted">Only rejected lodges can be edited and resent. <Link to="/agent" className="underline">Back to my lodges</Link></p>;

  async function onSave(row) {
    const payload = { ...row };
    const { error } = id
      ? await supabase.rpc("agent_update_lodge", { p_id: id, p: payload })
      : await supabase.rpc("agent_submit_lodge", { p: payload });
    if (error) return `Could not send it: ${error.message}`;
    navigate("/agent?sent=1");
    return null;
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <Panel>
        <LodgeForm
          initial={lodge} lockedAgent={agent} categories={categories} onSave={onSave}
          title={id ? "Edit and resend" : "Add a lodge"}
          actions={[{ key: "send", label: id ? "Resend for review" : "Send for review", variant: "primary" }]}
          top={<>
            <p className="text-[0.92rem] text-muted">Your lodge is checked by the site owner before it goes live. They may edit the details.</p>
            {id && lodge?.rejection_note && (
              <p className="rounded-lg bg-booked-soft px-3 py-2.5 text-[0.92rem] text-booked"><strong>Why it was rejected:</strong> {lodge.rejection_note}</p>
            )}
          </>}
        />
      </Panel>
    </div>
  );
}
