import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { lodgeTitle } from "../../lib/constants.js";
import { Btn } from "../../components/ui.jsx";

const CELL = "whitespace-nowrap border-b border-line-soft px-3.5 py-3 text-left";

export default function AdminInterests() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading");

  const load = async () => {
    setState("loading");
    const { data, error } = await supabase
      .from("requests")
      .select("id, name, phone, created_at, lodge_id, lodges(name, lodge_name)")
      .eq("type", "interest")
      .order("created_at", { ascending: false });
    if (error) return setState("error");
    setRows(data); setState("ready");
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl">Interests</h1>
        <Btn onClick={load}>Refresh</Btn>
      </div>
      {state === "loading" && <p className="py-8 text-muted">Loading…</p>}
      {state === "error" && <p className="py-8 text-booked">Could not load interests.</p>}
      {state === "ready" && rows.length === 0 && <p className="py-8 text-muted">Nothing here yet.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead><tr>{["Name", "Phone", "Lodge", "When"].map((h) => <th key={h} className={CELL}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={CELL}>{r.name}</td>
                  <td className={CELL}><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                  <td className={CELL}><Link to={`/lodge/${r.lodge_id}`}>{r.lodges ? lodgeTitle(r.lodges) : "—"}</Link></td>
                  <td className={CELL}>{new Date(r.created_at).toLocaleString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
