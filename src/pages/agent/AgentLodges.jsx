import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { naira, lodgeTitle } from "../../lib/constants.js";
import { Btn, Panel, Tag, cx } from "../../components/ui.jsx";

const TABS = [["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["booked", "Booked"], ["sold", "Sold"]];
const match = (l, k) =>
  k === "all" || (k === "booked" ? l.booked_count > 0 : k === "sold" ? l.sold_count > 0 : l.review_status === k);
const STATUS = {
  pending: ["sold", "Pending review"],
  approved: ["free", "Approved"],
  rejected: ["booked", "Rejected"],
};

export default function AgentLodges() {
  const [params] = useSearchParams();
  const [lodges, setLodges] = useState(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    supabase.rpc("agent_lodges").then(({ data }) => setLodges(data ?? []));
  }, []);

  const count = (k) => (lodges ?? []).filter((l) => match(l, k)).length;
  const shown = (lodges ?? []).filter((l) => match(l, tab));

  return (
    <>
      <h1 className="font-display text-2xl">My lodges</h1>
      {params.get("sent") && (
        <p className="mt-3 rounded-lg bg-green-soft px-4 py-3 text-green" role="status">Sent! The lodge is waiting for review. You'll see it move to Approved or Rejected here.</p>
      )}
      <div className="my-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cx("min-h-11 cursor-pointer rounded-full border border-ink px-4 text-[0.9rem]", tab === k ? "bg-ink text-white" : "bg-white")}>
            {label} ({lodges ? count(k) : 0})
          </button>
        ))}
      </div>

      {lodges === null && <p className="py-8 text-muted">Loading…</p>}
      {lodges && lodges.length === 0 && (
        <p className="py-8 text-muted">You haven't added a lodge yet. <Link to="/agent/new" className="underline">Add your first one</Link>.</p>
      )}
      {lodges && lodges.length > 0 && shown.length === 0 && <p className="py-8 text-muted">Nothing in this tab.</p>}

      <div className="grid gap-4">
        {shown.map((l) => {
          const [tone, label] = STATUS[l.review_status];
          const first = l.agent_price_first_year ?? l.price_first_year;
          const yearly = l.agent_price_yearly ?? l.price_yearly;
          return (
            <Panel key={l.id} pad="xs" className="grid gap-4 sm:grid-cols-[180px_1fr]">
              {l.video_url
                ? <video src={l.video_url} muted playsInline preload="metadata" className="aspect-[4/3] w-full rounded-[10px] object-cover" />
                : <div className="grid aspect-[4/3] w-full place-items-center rounded-[10px] bg-[#17302a] text-[0.9rem] text-mint">No video</div>}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-[1.1rem]">{lodgeTitle(l)}</h3>
                  <Tag tone={tone} pill>{label}</Tag>
                </div>
                <p className="mt-1 text-[0.92rem] text-muted">
                  {l.lodge_name ? `${l.name} · ` : ""}{l.location ? `${l.location} · ` : ""}{l.rooms} room{l.rooms > 1 ? "s" : ""} · {l.units_total} apartment{l.units_total > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-[0.92rem] text-muted">Your price: {naira(yearly)}/yr ({naira(first)} first year)</p>
                {l.review_status === "approved" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Tag>{l.booked_count} of {l.units_total} booked</Tag>
                    {l.sold_count > 0 && <Tag tone="sold">{l.sold_count} sold</Tag>}
                    <Tag tone={l.units_available === 0 ? "booked" : "free"}>{l.units_available} available</Tag>
                  </div>
                )}
                {l.review_status === "rejected" && l.rejection_note && (
                  <p className="mt-3 rounded-lg bg-booked-soft px-3 py-2.5 text-[0.92rem] text-booked"><strong>Why it was rejected:</strong> {l.rejection_note}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {l.review_status === "rejected" && <Btn as={Link} size="sm" variant="primary" to={`/agent/edit/${l.id}`}>Edit and resend</Btn>}
                  {l.review_status === "approved" && <Btn as={Link} size="sm" to={`/lodge/${l.id}`}>View on the site</Btn>}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
