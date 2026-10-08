import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { AGENT, naira, lodgeTitle, waNumber, premiumStats } from "../lib/constants.js";
import { useLodgeList } from "../lib/LodgeListContext.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import RequestModal from "../components/RequestModal.jsx";
import AuthModal from "../components/AuthModal.jsx";
import StatList from "../components/StatList.jsx";
import CopyLinkButton from "../components/CopyLinkButton.jsx";
import { Btn, Panel, Tag, cx } from "../components/ui.jsx";

const PBTN = "flex size-11 items-center justify-center rounded-full border border-line bg-white text-[1.4rem] leading-none no-underline";

function PagerButton({ to, label, children }) {
  return to ? (
    <Link to={to} className={cx(PBTN, "hover:border-ink")} aria-label={label}>{children}</Link>
  ) : (
    <span className={cx(PBTN, "pointer-events-none opacity-35")} aria-disabled="true" aria-label={`${label} (none)`}>{children}</span>
  );
}

export default function LodgeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ids: listIds } = useLodgeList();
  const [lodge, setLodge] = useState(null);
  const [missing, setMissing] = useState(false);
  const [modal, setModal] = useState(null); // 'interest' | 'booking' | null
  const [authOpen, setAuthOpen] = useState(false);
  const [mine, setMine] = useState(null);       // this user's active booking on this lodge
  const [connect, setConnect] = useState(null); // agent contact info, once the admin allows it
  const [fallbackIds, setFallbackIds] = useState([]);

  // Browser tab / history title follows the lodge (the shared-link tags are added server-side)
  useEffect(() => {
    if (!lodge) return;
    const prev = document.title;
    document.title = `${lodgeTitle(lodge)}: ${lodge.name}${lodge.location ? " in " + lodge.location : ""} | Futminna Lodges`;
    return () => { document.title = prev; };
  }, [lodge]);

  // If the page was opened directly (not from Browse), step through all lodges instead.
  const inList = listIds.includes(id);
  useEffect(() => {
    if (inList) return;
    let alive = true;
    supabase.from("lodges_with_stats").select("id").order("created_at", { ascending: false })
      .then(({ data }) => { if (alive) setFallbackIds((data ?? []).map((d) => d.id)); });
    return () => { alive = false; };
  }, [inList]);

  const ids = inList ? listIds : fallbackIds;
  const index = ids.indexOf(id);
  const prevId = index > 0 ? ids[index - 1] : null;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  const load = useCallback(async () => {
    setMissing(false);
    const { data, error } = await supabase.from("lodges_with_stats").select("*").eq("id", id).single();
    if (error || !data) return setMissing(true);
    setLodge(data);
  }, [id]);

  const loadMine = useCallback(async () => {
    if (!user) { setMine(null); setConnect(null); return; }
    const { data } = await supabase.from("bookings").select("*")
      .eq("lodge_id", id).eq("user_id", user.id).eq("status", "active").maybeSingle();
    setMine(data ?? null);
    if (data?.connect_allowed) {
      const { data: info } = await supabase.rpc("my_connect_info", { p_booking_id: data.id });
      setConnect(info ?? null);
    } else setConnect(null);
  }, [user, id]);

  useEffect(() => { load(); window.scrollTo(0, 0); }, [load]);
  useEffect(() => { loadMine(); }, [loadMine]);

  // Left / Right arrow keys move between lodges
  useEffect(() => {
    const onKey = (e) => {
      if (modal || authOpen) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "VIDEO"].includes(t.tagName))) return;
      if (e.key === "ArrowLeft" && prevId) navigate(`/lodge/${prevId}`);
      if (e.key === "ArrowRight" && nextId) navigate(`/lodge/${nextId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, authOpen, prevId, nextId, navigate]);

  if (missing) return <p className="py-8 text-muted">Lodge not found. <Link to="/" className="underline">Back to all lodges</Link></p>;
  if (!lodge || lodge.id !== id) return <p className="py-8 text-muted">Loading…</p>;

  const title = lodgeTitle(lodge);
  const waText = encodeURIComponent(`Hello, I'm interested in "${title}" on Futminna Lodges.`);
  const premium = premiumStats(lodge);
  const full = lodge.units_available === 0;
  const refresh = () => { load(); loadMine(); };

  const startBook = () => (user ? setModal("booking") : setAuthOpen(true));

  async function unbook() {
    if (!confirm("Unbook this lodge? The apartment becomes available to others again.")) return;
    await supabase.rpc("unbook", { p_booking_id: mine.id });
    refresh();
  }

  let contactHref = "";
  if (connect && mine) {
    const link = `${window.location.origin}/connect/${connect.token}`;
    const text = `Hello ${connect.agent_name}, I'm ${mine.name}. I'm interested in ${title}${lodge.location ? ` (${lodge.location})` : ""}. Here are the details: ${link}`;
    contactHref = `https://wa.me/${waNumber(connect.agent_whatsapp)}?text=${encodeURIComponent(text)}`;
  }
  const onContact = () => {
    supabase.rpc("mark_agent_contacted", { p_booking_id: mine.id }).then(() => {}, () => {});
  };

  const muted = "mt-1 text-[0.92rem] text-muted";
  const h3 = "font-display text-xl";

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="inline-flex min-h-11 items-center text-muted no-underline hover:text-ink">← All lodges</Link>
        <nav className="flex items-center gap-1.5" aria-label="Browse lodges">
          <PagerButton to={prevId && `/lodge/${prevId}`} label="Previous lodge">‹</PagerButton>
          {index >= 0 && <span className="min-w-14 text-center text-[0.8rem] tabular-nums text-muted" aria-live="polite">{index + 1} of {ids.length}</span>}
          <PagerButton to={nextId && `/lodge/${nextId}`} label="Next lodge">›</PagerButton>
        </nav>
      </div>

      <section aria-label="Agent" className="grid items-center gap-8 rounded-[14px] bg-band px-7 py-6 text-white md:grid-cols-[1.2fr_1fr_1.3fr]">
        <div className="flex items-center gap-4">
          <div aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-jade font-display text-xl font-extrabold">OF</div>
          <div>
            <h2 className="font-display text-[1.35rem]">{AGENT.name}</h2>
            <p className="text-[0.85rem] text-mint">Letting agent</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <Btn as="a" variant="jade" href={AGENT.callHref}>Call</Btn>
              <Btn as="a" variant="light" target="_blank" rel="noreferrer" href={`https://wa.me/${AGENT.whatsappIntl}?text=${waText}`}>WhatsApp</Btn>
            </div>
          </div>
        </div>
        <div className="flex gap-8 md:block">
          <p className="mb-2.5"><span className="block text-[0.8rem] text-mint">Phone</span>{AGENT.phone}</p>
          <p><span className="block text-[0.8rem] text-mint">WhatsApp</span>{AGENT.whatsapp}</p>
        </div>
        <p className="rounded-[10px] bg-band-2 p-4 leading-normal"><strong>Call before you commit.</strong> Lodges go fast, so confirm with the agent that this one is still available.</p>
      </section>

      <section className="my-8 grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid gap-5">
          <div>
            <div className="flex flex-wrap gap-1.5">
              {premium.map((p) => <Tag key={p.name} tone="premium" pill>{p.name}</Tag>)}
              {full
                ? <Tag tone="booked" pill>Fully booked</Tag>
                : <Tag tone="free" pill>{lodge.units_available} available</Tag>}
              {lodge.sold_count > 0 && <Tag tone="sold" pill>{lodge.sold_count} sold</Tag>}
            </div>
            <h1 className="mt-2.5 font-display text-[1.9rem] leading-tight md:text-[2.3rem]">{title}</h1>
            <p className={muted}>
              {lodge.lodge_name ? `${lodge.name} · ` : ""}{lodge.location ? `${lodge.location} · ` : ""}
              {lodge.rooms} room{lodge.rooms > 1 ? "s" : ""} · {lodge.interest_count} interested
            </p>
            <CopyLinkButton className="mt-3" url={`${window.location.origin}/lodge/${lodge.id}`} />
          </div>

          <Panel pad="sm" className="flex items-center gap-4">
            <div className="min-w-9 text-center font-display text-[2.4rem] font-extrabold leading-none">{lodge.units_available}</div>
            <div>
              <strong>{lodge.units_available === 1 ? "apartment" : "apartments"} available</strong>
              <p className="text-[0.92rem] text-muted">
                {lodge.booked_count} of {lodge.units_total} booked
                {lodge.sold_count > 0 && ` · ${lodge.sold_count} sold`}
              </p>
            </div>
          </Panel>

          <dl className="m-0 grid gap-3 sm:grid-cols-2">
            {[["First year", lodge.price_first_year], ["Every year after", lodge.price_yearly]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-white px-4 py-3.5">
                <dt className="text-[0.85rem] text-muted">{label}</dt>
                <dd className="m-0 font-display text-[1.55rem] font-extrabold">{naira(value)}</dd>
              </div>
            ))}
          </dl>

          <Panel>
            <h3 className="font-display text-lg">What it has</h3>
            <StatList stats={lodge.stats} />
          </Panel>
        </div>

        <div>
          {lodge.video_url
            ? <video key={lodge.id} src={lodge.video_url} controls playsInline preload="metadata" className="block aspect-[16/10] max-h-[72vh] w-full rounded-[14px] bg-black object-contain" />
            : <div className="grid aspect-[16/10] w-full place-items-center rounded-[14px] bg-[#17302a] text-[0.9rem] text-mint">No footage yet</div>}
        </div>
      </section>

      <section aria-label="Next steps" className="grid gap-5 border-t-2 border-ink pt-7 md:grid-cols-2">
        <Panel className="flex flex-col justify-between gap-4">
          <div>
            <h3 className={h3}>Just looking? Show interest</h3>
            <p className={muted}>The agent will call you about this lodge. You are not committing to buy.</p>
          </div>
          <Btn className="w-full" onClick={() => setModal("interest")}>Show interest</Btn>
        </Panel>

        {mine ? (
          <Panel accent="green" className="flex flex-col justify-between gap-4">
            <div>
              <h3 className={h3}>You've booked this lodge</h3>
              <p className={muted}>
                {connect
                  ? "The agent for this lodge is ready to hear from you."
                  : `Once ${AGENT.name} connects you with the lodge's agent, a contact button will appear here.`}
              </p>
            </div>
            <div className="grid gap-2.5">
              {connect && (
                <Btn as="a" variant="primary" className="w-full" href={contactHref} target="_blank" rel="noreferrer" onClick={onContact}>
                  Contact agent for this lodge
                </Btn>
              )}
              <Btn className="w-full" onClick={unbook}>Unbook</Btn>
            </div>
          </Panel>
        ) : (
          <Panel accent={full ? "default" : "green"} className="flex flex-col justify-between gap-4">
            <div>
              <h3 className={h3}>{full ? "Fully booked" : "Ready to take it? Book"}</h3>
              <p className={muted}>
                {full
                  ? "Every apartment here has been taken. Show interest to hear when one frees up."
                  : `Booking holds one of the ${lodge.units_available} available apartment${lodge.units_available > 1 ? "s" : ""}. You'll sign in first so we can keep track of your booking.`}
              </p>
            </div>
            <Btn variant="primary" className="w-full" disabled={full} onClick={startBook}>
              {full ? "Fully booked" : "Book this lodge"}
            </Btn>
          </Panel>
        )}
      </section>

      {authOpen && (
        <AuthModal reason="Sign in to book this lodge." onClose={() => setAuthOpen(false)}
          onSuccess={() => { setAuthOpen(false); setModal("booking"); }} />
      )}
      {modal && <RequestModal lodge={lodge} type={modal} user={user} onClose={() => setModal(null)} onDone={refresh} />}
    </>
  );
}
