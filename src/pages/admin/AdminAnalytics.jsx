import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { naira } from "../../lib/constants.js";
import { Btn, Panel, cx, selectCls } from "../../components/ui.jsx";
import { IconBookmark, IconBuilding, IconHeart, IconTag } from "../../components/icons.jsx";

const num = (n) => Number(n || 0).toLocaleString("en-NG");
const day = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });

// Colour-coded value backgrounds (same palette as the rest of the site)
const TONE = {
  free: "bg-green-soft text-green",
  interest: "bg-premium-soft text-premium-ink",
  booked: "bg-booked-soft text-booked",
  sold: "bg-sold-soft text-sold",
  lodges: "bg-silver-soft text-ink",
};

function Tile({ label, value, hint, tone = "lodges" }) {
  return (
    <div className={cx("rounded-xl px-4 py-3.5", TONE[tone])}>
      <div className="text-[0.85rem] font-bold opacity-80">{label}</div>
      <div className="font-display text-[1.9rem] font-extrabold leading-tight">{value}</div>
      {hint && <div className="text-[0.8rem] opacity-80">{hint}</div>}
    </div>
  );
}

function Chip({ tone, icon, value, label }) {
  return (
    <span title={`${value} ${label}`} className={cx("inline-flex min-w-14 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[0.85rem] font-bold", TONE[tone])}>
      {icon}{value}<span className="sr-only"> {label}</span>
    </span>
  );
}

function H2({ children, note }) {
  return (
    <div className="mb-3 mt-9 flex flex-wrap items-baseline gap-x-3">
      <h2 className="font-display text-xl">{children}</h2>
      {note && <span className="text-[0.85rem] text-muted">{note}</span>}
    </div>
  );
}

function DailyBars({ daily }) {
  const max = Math.max(1, ...daily.map((d) => d.visitors));
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label="Visitors per day">
        {daily.map((d) => (
          <div key={d.day} title={`${day(d.day)}: ${d.visitors} visitor${d.visitors === 1 ? "" : "s"}, ${d.views} page view${d.views === 1 ? "" : "s"}`}
            className={cx("min-h-[3px] flex-1 rounded-t", d.visitors ? "bg-green hover:bg-jade" : "bg-line")}
            style={{ height: `${(d.visitors / max) * 100}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.75rem] text-muted">
        <span>{day(daily[0].day)}</span>
        <span>busiest day: {max} visitor{max === 1 ? "" : "s"}</span>
        <span>{day(daily[daily.length - 1].day)}</span>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_analytics", { p_days: days });
    if (error) setError(error.message);
    else { setError(""); setData(data); }
  }, [days]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // keep "online now" fresh
    return () => clearInterval(t);
  }, [load]);

  if (error && !data) {
    return (
      <Panel accent="default" className="text-booked">
        Could not load analytics: {error}
        <p className="mt-2 text-[0.9rem] text-muted">If this says the function doesn't exist, run supabase/v5-migration.sql in the Supabase SQL Editor.</p>
      </Panel>
    );
  }
  if (!data) return <p className="py-8 text-muted">Loading…</p>;

  const { apartments: a, agents, traffic: t, signups: s, money: m } = data;
  const sinceText = t.since ? new Date(t.since).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[1.9rem] leading-tight">Analytics</h1>
        <div className="flex items-center gap-2">
          <select className={selectCls} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Traffic range">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Btn size="sm" onClick={load}>Refresh</Btn>
        </div>
      </div>

      <H2 note={`${num(a.lodges)} live lodge${a.lodges === 1 ? "" : "s"}, ${num(a.total)} apartments in all`}>Apartments</H2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile tone="free" label="Available" value={num(a.available)} hint={`of ${num(a.total)} apartments`} />
        <Tile tone="interest" label="With interest" value={num(a.interests)} hint={`people, across ${num(a.lodges_with_interest)} lodge${a.lodges_with_interest === 1 ? "" : "s"}`} />
        <Tile tone="booked" label="Booked" value={num(a.booked)} hint="held right now" />
        <Tile tone="sold" label="Sold" value={num(a.sold)} hint="completed" />
      </div>

      <H2 note="first-year prices of apartments marked sold">Money</H2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile tone="free" label="Made through the site" value={naira(m.revenue)} hint={`${num(m.sold)} apartment${m.sold === 1 ? "" : "s"} sold`} />
        <Tile tone="interest" label="Your profit" value={naira(m.profit)} hint="what you added to the agents' base prices" />
      </div>
      <p className="mt-2 text-[0.8rem] text-muted">Only apartments you marked <strong>sold</strong> count, and only the first year's price. Lodges you added yourself have no agent base price recorded, so they add ₦0 to profit.</p>

      <H2 note={sinceText ? `counting since ${sinceText}` : "no visits recorded yet"}>Traffic</H2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile tone="free" label="Online now" value={num(t.online_now)} hint="active in the last 30 minutes" />
        <Tile tone="lodges" label="Visitors today" value={num(t.today_visitors)} />
        <Tile tone="lodges" label="Visitors in total" value={num(t.total_visitors)} hint={`${num(t.total_views)} page views`} />
        <Tile tone="interest" label="Sign-ups" value={num(s.total)} hint={`${num(s.last_7)} in 7 days, ${num(s.last_30)} in 30`} />
      </div>
      <Panel className="mt-3">
        <h3 className="mb-3 font-display text-lg">Visitors per day</h3>
        <DailyBars daily={t.daily} />
        <details className="mt-4">
          <summary className="cursor-pointer text-[0.9rem] font-bold">See the numbers day by day</summary>
          <table className="mt-2 w-full text-left text-[0.9rem]">
            <thead><tr className="text-muted"><th className="py-1 font-bold">Day</th><th className="py-1 font-bold">Visitors</th><th className="py-1 font-bold">Page views</th></tr></thead>
            <tbody>
              {[...t.daily].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line-soft"><td className="py-1">{day(d.day)}</td><td>{d.visitors}</td><td>{d.views}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="mt-3 text-[0.8rem] text-muted">A visitor is counted once per day per browser (anonymous id, no IP addresses). Admin pages and your own browser are not counted. Counting starts from when v5 was installed.</p>
      </Panel>

      <H2 note="tap an agent for their full stats">Agents</H2>
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.8rem] text-muted">
        <span className="inline-flex items-center gap-1.5"><IconBuilding /> lodges uploaded</span>
        <span className="inline-flex items-center gap-1.5"><IconBookmark /> with a booking</span>
        <span className="inline-flex items-center gap-1.5"><IconHeart /> with interest</span>
        <span className="inline-flex items-center gap-1.5"><IconTag /> with a sale</span>
      </div>
      {agents.length === 0 && <p className="py-4 text-muted">No agents yet.</p>}
      <div className="grid gap-2.5">
        {agents.map((ag) => (
          <Link key={ag.id} to={`/admin/agents/${ag.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-line bg-white px-4 py-3 no-underline hover:border-ink">
            <strong className="min-w-32 grow">{ag.name}</strong>
            <span className="flex flex-wrap gap-1.5">
              <Chip tone="lodges" icon={<IconBuilding />} value={ag.lodges} label="lodges uploaded" />
              <Chip tone="booked" icon={<IconBookmark />} value={ag.booked} label="lodges with a booking" />
              <Chip tone="interest" icon={<IconHeart />} value={ag.interested} label="lodges with interest" />
              <Chip tone="sold" icon={<IconTag />} value={ag.sold} label="lodges with a sale" />
            </span>
            <span aria-hidden className="text-muted">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}
