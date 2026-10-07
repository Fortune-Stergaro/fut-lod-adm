import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { AGENT, ROLES, naira, lodgeTitle } from "../lib/constants.js";
import StatList from "../components/StatList.jsx";
import { Panel } from "../components/ui.jsx";

const initials = (n) => (n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function Person({ name, role }) {
  return (
    <div className="flex items-center gap-3.5">
      <div aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-jade font-display text-xl font-extrabold">{initials(name)}</div>
      <div>
        <strong className="block text-[1.05rem]">{name}</strong>
        <span className="text-[0.8rem] text-mint">{role}</span>
      </div>
    </div>
  );
}

// Special link shared with the lodge's agent: /connect/<token>
export default function ConnectPage() {
  const { token } = useParams();
  const [data, setData] = useState(undefined);

  useEffect(() => {
    supabase.rpc("get_connection", { p_token: token }).then(({ data, error }) => setData(error ? null : data));
  }, [token]);

  if (data === undefined) return <p className="py-8 text-muted">Loading…</p>;
  if (!data) return <p className="py-8 text-muted">This link isn't available.</p>;

  const l = data.lodge;
  const inactive = data.status !== "active" && data.status !== "sold";

  return (
    <>
      <section aria-label="People involved" className="mb-6 grid gap-4 rounded-[14px] bg-band px-6 py-5 text-white md:grid-cols-3">
        <Person name={data.client_name} role={ROLES.client} />
        <Person name={AGENT.name} role={ROLES.coordinator} />
        <Person name={data.agent_name || "Not assigned"} role={ROLES.agent} />
      </section>

      {inactive && <p className="mb-4 rounded-lg bg-sold-soft px-4 py-3 text-[#6b4600]">This booking is no longer active.</p>}

      <section className="grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid gap-5">
          <div>
            <h1 className="font-display text-[1.9rem] leading-tight md:text-[2.3rem]">{lodgeTitle(l)}</h1>
            <p className="mt-1 text-[0.92rem] text-muted">
              {l.lodge_name ? `${l.name} · ` : ""}{l.location ? `${l.location} · ` : ""}{l.rooms} room{l.rooms > 1 ? "s" : ""}
            </p>
          </div>
          <dl className="m-0 grid gap-3 sm:grid-cols-2">
            {[["First year", l.price_first_year], ["Every year after", l.price_yearly]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
                <dt className="text-[0.85rem] text-muted">{label}</dt>
                <dd className="m-0 font-display text-[1.55rem] font-extrabold">{naira(value)}</dd>
              </div>
            ))}
          </dl>
          <Panel>
            <h3 className="font-display text-lg">What it has</h3>
            <StatList stats={l.stats} />
          </Panel>
        </div>
        <div>
          {l.video_url
            ? <video src={l.video_url} controls playsInline preload="metadata" className="block aspect-[16/10] max-h-[72vh] w-full rounded-[14px] bg-black object-contain" />
            : <div className="grid aspect-[16/10] w-full place-items-center rounded-[14px] bg-[#17302a] text-[0.9rem] text-mint">No footage yet</div>}
        </div>
      </section>
    </>
  );
}
