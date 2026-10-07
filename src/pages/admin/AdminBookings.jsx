import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { lodgeTitle } from "../../lib/constants.js";
import { Btn, Tag, cx } from "../../components/ui.jsx";

const TABS = [["all", "All"], ["active", "Booked"], ["sold", "Sold"], ["revoked", "Revoked"], ["unbooked", "Unbooked"]];
const LABEL = { active: "Booked", sold: "Sold", revoked: "Revoked", unbooked: "Unbooked" };
const TONE = { active: "free", sold: "sold", revoked: "booked", unbooked: "plain" };
const CELL = "whitespace-nowrap border-b border-line-soft px-3.5 py-3 text-left align-top";

export default function AdminBookings() {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("all");
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, lodges(id, name, lodge_name, agent_id, agents(name))")
      .order("created_at", { ascending: false });
    if (error) return setState("error");
    setRows(data); setState("ready");
  };
  useEffect(() => { load(); }, []);

  async function act(fn, args, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    setError("");
    const { error } = await supabase.rpc(fn, args);
    if (error) setError("That didn't work. Try again."); else load();
  }

  const shown = rows.filter((r) => tab === "all" || r.status === tab);
  const count = (k) => (k === "all" ? rows.length : rows.filter((r) => r.status === k).length);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl">Bookings</h1>
        <Btn onClick={load}>Refresh</Btn>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cx("min-h-11 cursor-pointer rounded-full border border-ink px-4 text-[0.9rem]", tab === k ? "bg-ink text-white" : "bg-white")}>
            {label} ({count(k)})
          </button>
        ))}
      </div>
      {error && <p className="text-booked">{error}</p>}
      {state === "loading" && <p className="py-8 text-muted">Loading…</p>}
      {state === "error" && <p className="py-8 text-booked">Could not load bookings.</p>}
      {state === "ready" && shown.length === 0 && <p className="py-8 text-muted">Nothing here yet.</p>}
      {shown.length > 0 && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr>{["Client", "Phone", "Lodge", "Agent", "Status", "Booked", "Actions"].map((h) => <th key={h} className={CELL}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const agent = r.lodges?.agents?.name;
                return (
                  <tr key={r.id}>
                    <td className={CELL}>{r.name}<br /><span className="text-muted">{r.email}</span></td>
                    <td className={CELL}><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                    <td className={CELL}><Link to={`/lodge/${r.lodge_id}`}>{r.lodges ? lodgeTitle(r.lodges) : "—"}</Link></td>
                    <td className={CELL}>
                      {agent ? <Link to={`/admin/agents/${r.lodges.agent_id}`} className="underline">{agent}</Link> : <span className="text-muted">None attached</span>}
                    </td>
                    <td className={CELL}>
                      <Tag tone={TONE[r.status]}>{LABEL[r.status]}</Tag>
                      {r.status !== "active" && <div className="text-muted">{new Date(r.status_changed_at).toLocaleDateString("en-NG")}</div>}
                    </td>
                    <td className={CELL}>{new Date(r.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className={CELL}>
                      {r.status === "active" && (
                        <div className="flex flex-wrap gap-2">
                          {r.connect_allowed ? (
                            <Tag tone="free">{r.agent_contacted_at ? "Agent contacted" : "Agent contact on"}</Tag>
                          ) : (
                            <Btn size="sm" disabled={!agent} title={agent ? "" : "Attach an agent to this lodge first"}
                              onClick={() => act("admin_allow_connect", { p_booking_id: r.id })}>
                              Connect client with agent
                            </Btn>
                          )}
                          <Btn size="sm" onClick={() => act("admin_set_booking_status", { p_booking_id: r.id, p_status: "sold" }, `Declare this apartment sold to ${r.name}?`)}>Mark sold</Btn>
                          <Btn size="sm" variant="danger" onClick={() => act("admin_set_booking_status", { p_booking_id: r.id, p_status: "revoked" }, `Revoke ${r.name}'s booking? The apartment becomes available again.`)}>Revoke</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
