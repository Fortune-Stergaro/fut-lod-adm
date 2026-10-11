import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { AGENT, ROLES, naira, lodgeTitle } from "../lib/constants.js";
import { FeatureGroups, SectionPill } from "../components/lodgeUi.jsx";
import { Panel } from "../components/ui.jsx";

const initials = (n) => (n || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const TONES = { client: "bg-amber text-plum", coordinator: "bg-violet text-white", agent: "bg-lilac text-plum" };

function Person({ name, role, tone }) {
  return (
    <div className="flex items-center gap-3.5">
      <div aria-hidden className={`flex size-14 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold ${TONES[tone]}`}>{initials(name)}</div>
      <div>
        <strong className="block text-[1.05rem]">{name}</strong>
        <span className="font-jet text-[10px] font-bold uppercase tracking-[1px] text-mint">{role}</span>
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
    <div>
      <SectionPill>Agent connection</SectionPill>
      <section aria-label="People involved" className="mb-6 mt-4 grid gap-4 rounded-2xl bg-plum-2 px-6 py-5 text-white md:grid-cols-3">
        <Person name={data.client_name} role={ROLES.client} tone="client" />
        <Person name={AGENT.name} role={ROLES.coordinator} tone="coordinator" />
        <Person name={data.agent_name || "Not assigned"} role={ROLES.agent} tone="agent" />
      </section>

      {inactive && <p className="mb-4 rounded-xl bg-sold-soft px-4 py-3 text-[#6b4600]">This booking is no longer active.</p>}

      <section className="grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid gap-5">
          <div>
            <h1 className="font-display text-[1.9rem] font-bold leading-tight text-ink md:text-[2.3rem]">{lodgeTitle(l)}</h1>
            <p className="mt-1 text-[0.92rem] text-muted">
              {l.lodge_name ? `${l.name} · ` : ""}{l.location ? `${l.location} · ` : ""}{l.rooms} room{l.rooms > 1 ? "s" : ""}
            </p>
          </div>
          <dl className="m-0 grid gap-3 sm:grid-cols-2">
            {[["First year", l.price_first_year], ["Every year after", l.price_yearly]].map(([label, value]) => (
              <Panel key={label} pad="sm">
                <dd className="m-0 font-display text-[1.6rem] font-bold leading-tight text-ink">{naira(value)}</dd>
                <dt className="font-jet text-[11px] uppercase tracking-[0.55px] text-plum-300">{label}</dt>
              </Panel>
            ))}
          </dl>
          <Panel>
            <SectionPill>What it has</SectionPill>
            <FeatureGroups stats={l.stats} />
          </Panel>
        </div>
        <div>
          {l.video_url
            ? <video src={l.video_url} controls playsInline preload="metadata" className="block aspect-[16/10] max-h-[72vh] w-full rounded-2xl bg-black object-contain shadow-[0_16px_60px_rgba(43,16,67,0.25)]" />
            : <div className="grid aspect-[16/10] w-full place-items-center rounded-2xl bg-plum-2 font-jet text-[12px] text-mint">No footage yet</div>}
        </div>
      </section>
    </div>
  );
}
