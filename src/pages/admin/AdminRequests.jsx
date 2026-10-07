import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { naira, lodgeTitle } from "../../lib/constants.js";
import { Btn, Panel, Tag, cx } from "../../components/ui.jsx";

const TABS = [["pending", "Pending"], ["rejected", "Rejected"]];

// Lodges agents have sent in, waiting for you.
export default function AdminRequests() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("pending");

  useEffect(() => {
    supabase.rpc("admin_lodges").then(({ data }) => setRows((data ?? []).filter((l) => l.review_status !== "approved")));
  }, []);

  const count = (k) => (rows ?? []).filter((l) => l.review_status === k).length;
  const shown = (rows ?? []).filter((l) => l.review_status === tab);

  return (
    <>
      <h1 className="font-display text-2xl">Lodge requests</h1>
      <p className="mt-1 text-[0.92rem] text-muted">Review what agents send in. Edit anything, add your fee to the prices, then approve to publish or reject with a note.</p>
      <div className="my-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cx("min-h-11 cursor-pointer rounded-full border border-ink px-4 text-[0.9rem]", tab === k ? "bg-ink text-white" : "bg-white")}>
            {label} ({rows ? count(k) : 0})
          </button>
        ))}
      </div>
      {rows === null && <p className="py-8 text-muted">Loading…</p>}
      {rows && shown.length === 0 && <p className="py-8 text-muted">Nothing {tab} right now.</p>}
      <div className="grid gap-4">
        {shown.map((l) => (
          <Panel key={l.id} pad="xs" className="grid gap-4 sm:grid-cols-[180px_1fr]">
            {l.video_url
              ? <video src={l.video_url} muted playsInline preload="metadata" className="aspect-[4/3] w-full rounded-[10px] object-cover" />
              : <div className="grid aspect-[4/3] w-full place-items-center rounded-[10px] bg-[#17302a] text-[0.9rem] text-mint">No video</div>}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[1.1rem]">{lodgeTitle(l)}</h3>
                <Tag tone={l.review_status === "pending" ? "sold" : "booked"} pill>{l.review_status === "pending" ? "Pending review" : "Rejected"}</Tag>
              </div>
              <p className="mt-1 text-[0.92rem] text-muted">
                {l.lodge_name ? `${l.name} · ` : ""}{l.location ? `${l.location} · ` : ""}{l.rooms} room{l.rooms > 1 ? "s" : ""} · {l.units_total} apartment{l.units_total > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-[0.92rem] text-muted">
                Agent: {l.agent_id ? <Link to={`/admin/agents/${l.agent_id}`} className="font-bold text-ink underline">{l.agent_name}</Link> : "none"}
                {l.submitted_at && ` · sent ${new Date(l.submitted_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}`}
              </p>
              <p className="mt-1 text-[0.92rem] text-muted">Agent's price: {naira(l.agent_price_yearly ?? l.price_yearly)}/yr ({naira(l.agent_price_first_year ?? l.price_first_year)} first year)</p>
              {l.rejection_note && <p className="mt-2 text-[0.92rem] text-booked"><strong>Your note:</strong> {l.rejection_note}</p>}
              <div className="mt-3">
                <Btn as={Link} size="sm" variant="primary" to={`/admin/requests/${l.id}`}>{l.review_status === "pending" ? "Review" : "Open"}</Btn>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
