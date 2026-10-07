import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { lodgeTitle, naira, waNumber } from "../../lib/constants.js";
import { Panel, Tag } from "../../components/ui.jsx";

const REVIEW = { pending: ["sold", "Pending"], approved: ["free", "Live"], rejected: ["booked", "Rejected"] };

// One agent: contact details and how their lodges are doing.
export default function AdminAgentPage() {
  const { id } = useParams();
  const [agent, setAgent] = useState(undefined);
  const [lodges, setLodges] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from("agents").select("*").eq("id", id).maybeSingle(),
      supabase.rpc("admin_lodges"),
    ]).then(([a, l]) => {
      setAgent(a.data ?? null);
      setLodges((l.data ?? []).filter((x) => x.agent_id === id));
    });
  }, [id]);

  if (agent === undefined) return <p className="py-8 text-muted">Loading…</p>;
  if (!agent) return <p className="py-8 text-muted">Agent not found. <Link to="/admin/agents" className="underline">Back to agents</Link></p>;

  const sum = (k) => lodges.reduce((n, l) => n + (l[k] || 0), 0);
  const live = lodges.filter((l) => l.review_status === "approved").length;
  const pending = lodges.filter((l) => l.review_status === "pending").length;
  const stats = [
    ["Lodges uploaded", lodges.length],
    ["Sold", sum("sold_count")],
    ["Currently booked", sum("booked_count")],
    ["Live on the site", live],
    ["Waiting for review", pending],
  ];

  return (
    <>
      <Link to="/admin/agents" className="mb-3 inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">← All agents</Link>
      <Panel className="grid gap-1.5">
        <h1 className="font-display text-[1.9rem] leading-tight">{agent.name}</h1>
        <p className="text-[0.95rem]">
          <span className="text-muted">WhatsApp: </span>
          <a href={`https://wa.me/${waNumber(agent.whatsapp)}`} target="_blank" rel="noreferrer" className="underline">{agent.whatsapp}</a>
        </p>
        <p className="text-[0.95rem]">
          <span className="text-muted">Email: </span>
          {agent.email ? <a href={`mailto:${agent.email}`} className="underline">{agent.email}</a> : <span className="text-muted">not set</span>}
        </p>
      </Panel>

      <div className="my-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
            <div className="text-[0.85rem] text-muted">{label}</div>
            <div className="font-display text-[1.8rem] font-extrabold leading-tight">{value}</div>
          </div>
        ))}
      </div>

      <h2 className="font-display text-xl">Their lodges</h2>
      {lodges.length === 0 && <p className="py-8 text-muted">No lodges yet.</p>}
      <div className="mt-3 grid gap-3">
        {lodges.map((l) => {
          const [tone, label] = REVIEW[l.review_status];
          return (
            <Panel key={l.id} pad="sm" className="flex flex-wrap items-center gap-3">
              <strong>{l.review_status === "pending" ? <Link to={`/admin/requests/${l.id}`} className="underline">{lodgeTitle(l)}</Link> : lodgeTitle(l)}</strong>
              <Tag tone={tone} pill>{label}</Tag>
              {l.review_status === "approved" && <Tag>{l.booked_count} of {l.units_total} booked</Tag>}
              {l.sold_count > 0 && <Tag tone="sold">{l.sold_count} sold</Tag>}
              <span className="ml-auto text-[0.9rem] text-muted">{naira(l.price_yearly)}/yr</span>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
