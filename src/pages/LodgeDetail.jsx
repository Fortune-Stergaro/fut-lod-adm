import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { AGENT, naira, waNumber, premiumStats } from "../lib/constants.js";
import { useLodgeList } from "../lib/LodgeListContext.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import RequestModal from "../components/RequestModal.jsx";
import AuthModal from "../components/AuthModal.jsx";
import CopyLinkButton from "../components/CopyLinkButton.jsx";
import { FeatureChip, SectionPill, StatusPill, UnitBar, btnAmber, btnGhostLight, btnOutline, btnPlum, sortedStats } from "../components/lodgeUi.jsx";
import { IconArrow, IconDoor, IconHeart, IconPhone, IconPin } from "../components/lodgeIcons.jsx";

const PBTN = "flex size-11 items-center justify-center rounded-full border border-plum/15 bg-white text-[1.4rem] leading-none text-plum no-underline shadow-[0_2px_10px_rgba(43,16,67,0.06)]";
const GLOW = "radial-gradient(55% 70% at -5% 70%, rgba(255,178,52,0.14) 0%, rgba(0,0,0,0) 55%)";

function PagerButton({ to, label, children }) {
  return to ? (
    <Link to={to} className={`${PBTN} hover:border-plum`} aria-label={label}>{children}</Link>
  ) : (
    <span className={`${PBTN} pointer-events-none opacity-35`} aria-disabled="true" aria-label={`${label} (none)`}>{children}</span>
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
    document.title = `${lodge.name}${lodge.location ? " in " + lodge.location : ""} | Futminna Lodges`;
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

  const title = lodge.name; // public pages never show the lodge's own name
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

  const features = sortedStats(lodge);
  const groups = [["premium", "Premium"], ["convenient", "Convenient"], ["essential", "Essential"]]
    .map(([key, label]) => ({ key, label, items: features.filter((s) => s.status === key && s.available) }))
    .filter((g) => g.items.length > 0);
  const missingFeatures = features.filter((s) => !s.available);
  const initials = AGENT.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const card = "rounded-2xl border border-plum/10 bg-white shadow-[0_2px_14px_rgba(43,16,67,0.06)]";
  const h3 = "font-bai text-[20px] font-bold text-plum";

  return (
    <div className="font-pop">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 font-bai text-[13px] font-semibold text-plum-200 no-underline hover:text-plum">← All lodges</Link>
        <nav className="flex items-center gap-1.5" aria-label="Browse lodges">
          <PagerButton to={prevId && `/lodge/${prevId}`} label="Previous lodge">‹</PagerButton>
          {index >= 0 && <span className="min-w-14 text-center font-jet text-[12px] tabular-nums text-plum-300" aria-live="polite">{index + 1} of {ids.length}</span>}
          <PagerButton to={nextId && `/lodge/${nextId}`} label="Next lodge">›</PagerButton>
        </nav>
      </div>

      {/* Overview */}
      <section aria-label="Lodge overview" className="relative overflow-hidden rounded-[20px] border border-plum/10 bg-white">
        <div aria-hidden className="dot-grid absolute inset-0" />
        <div aria-hidden className="absolute inset-0" style={{ background: GLOW }} />
        <div className="relative grid items-center gap-8 px-6 py-8 md:px-10 md:py-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill lodge={lodge} />
              {lodge.sold_count > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber/20 px-2.5 py-1 font-jet text-[10px] font-bold uppercase tracking-[0.25px] text-[#8A5A00]">{lodge.sold_count} sold</span>
              )}
            </div>
            <h1 className="mt-4 font-bai text-[34px] font-bold uppercase leading-[1.05] tracking-[-0.5px] text-plum md:text-[46px]">{title}</h1>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-jet text-[12px] text-plum-300">
              {lodge.location && <li className="flex items-center gap-1.5"><IconPin />{lodge.location}</li>}
              <li className="flex items-center gap-1.5"><IconDoor />{lodge.rooms} room{lodge.rooms > 1 ? "s" : ""}</li>
              <li className="flex items-center gap-1.5"><IconHeart />{lodge.interest_count} interested</li>
            </ul>
            {premium.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">{premium.map((p) => <FeatureChip key={p.name} stat={p} />)}</div>
            )}
            <CopyLinkButton plum className="mt-5" url={`${window.location.origin}/lodge/${lodge.id}`} />
            <dl className="m-0 mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-plum/10 pt-6">
              {[["First year", lodge.price_first_year], ["Every year after", lodge.price_yearly]].map(([label, value]) => (
                <div key={label}>
                  <dd className="m-0 font-bai text-[28px] font-bold leading-tight text-plum">{naira(value)}</dd>
                  <dt className="font-jet text-[11px] uppercase tracking-[0.55px] text-plum-300">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div>
            {lodge.video_url
              ? <video key={lodge.id} src={lodge.video_url} controls playsInline preload="metadata" className="block aspect-[16/10] max-h-[72vh] w-full rounded-2xl bg-black object-contain shadow-[0_16px_60px_rgba(43,16,67,0.25)]" />
              : <div className="grid aspect-[16/10] w-full place-items-center rounded-2xl bg-plum-2 font-jet text-[12px] text-plum-300">No footage yet</div>}
          </div>
        </div>
      </section>

      {/* Agent */}
      <section aria-label="Agent" className="mt-6 grid items-center gap-6 rounded-2xl bg-plum-2 px-6 py-6 text-white md:grid-cols-[1.2fr_1fr_1.3fr] md:gap-8 md:px-8">
        <div className="flex items-center gap-4">
          <div aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber font-bai text-[20px] font-bold text-plum">{initials}</div>
          <div>
            <p className="font-jet text-[10px] font-bold uppercase tracking-[1.5px] text-amber/80">Letting agent</p>
            <h2 className="font-bai text-[22px] font-bold leading-tight">{AGENT.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <a className={btnAmber} href={AGENT.callHref}><IconPhone />Call</a>
              <a className={btnGhostLight} target="_blank" rel="noreferrer" href={`https://wa.me/${AGENT.whatsappIntl}?text=${waText}`}>WhatsApp</a>
            </div>
          </div>
        </div>
        <div className="flex gap-8 md:block">
          <p className="mb-2.5"><span className="block font-jet text-[10px] uppercase tracking-[0.8px] text-plum-300">Phone</span>{AGENT.phone}</p>
          <p><span className="block font-jet text-[10px] uppercase tracking-[0.8px] text-plum-300">WhatsApp</span>{AGENT.whatsapp}</p>
        </div>
        <p className="rounded-[10px] bg-white/8 p-4 text-[13px] leading-relaxed text-white/85"><strong className="text-amber">Call before you commit.</strong> Lodges go fast, so confirm with the agent that this one is still available.</p>
      </section>

      {/* Availability + features */}
      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className={`${card} p-6`}>
          <SectionPill>Availability</SectionPill>
          <div className="mt-4 flex items-end gap-3">
            <span className="font-bai text-[56px] font-bold leading-none text-plum">{lodge.units_available}</span>
            <span className="pb-1.5 text-[14px] text-plum-200">{lodge.units_available === 1 ? "apartment" : "apartments"} available</span>
          </div>
          <div className="mt-5"><UnitBar lodge={lodge} /></div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-jet text-[10px] uppercase tracking-[0.5px] text-plum-300">
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-ok" />Free {lodge.units_available}</li>
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-warn" />Booked {lodge.booked_count}</li>
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-amber" />Sold {lodge.sold_count}</li>
          </ul>
          <p className="mt-4 text-[13px] text-plum-200">{lodge.booked_count} of {lodge.units_total} booked{lodge.sold_count > 0 && ` · ${lodge.sold_count} sold`}</p>
        </div>

        <div className={`${card} p-6`}>
          <SectionPill>What it has</SectionPill>
          {groups.length === 0 && missingFeatures.length === 0 && <p className="mt-4 text-[13px] text-plum-200">No features listed yet.</p>}
          <div className="mt-4 grid gap-5">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="mb-2 font-jet text-[10px] font-bold uppercase tracking-[1px] text-plum-300">{g.label}</div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-1.5">
                      <FeatureChip stat={s} className="!py-1 !text-[11px]" />
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {missingFeatures.length > 0 && (
              <div>
                <div className="mb-2 font-jet text-[10px] font-bold uppercase tracking-[1px] text-plum-300">Not available</div>
                <div className="flex flex-wrap gap-2">{missingFeatures.map((s) => <FeatureChip key={s.name} stat={s} off className="!py-1 !text-[11px]" />)}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Next steps */}
      <section aria-label="Next steps" className="mt-8 grid gap-5 border-t border-plum/10 pt-8 md:grid-cols-2">
        <div className={`${card} flex flex-col justify-between gap-5 p-6`}>
          <div>
            <h3 className={h3}>Just looking? Show interest</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-plum-200">The agent will call you about this lodge. You are not committing to buy.</p>
          </div>
          <button type="button" className={`${btnOutline} w-full`} onClick={() => setModal("interest")}>Show interest</button>
        </div>

        {mine ? (
          <div className="flex flex-col justify-between gap-5 rounded-2xl bg-plum p-6 text-white shadow-[0_8px_30px_rgba(43,16,67,0.3)]">
            <div>
              <h3 className="font-bai text-[20px] font-bold text-amber">You've booked this lodge</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
                {connect
                  ? "The agent for this lodge is ready to hear from you."
                  : `Once ${AGENT.name} connects you with the lodge's agent, a contact button will appear here.`}
              </p>
            </div>
            <div className="grid gap-2.5">
              {connect && (
                <a className={`${btnAmber} w-full`} href={contactHref} target="_blank" rel="noreferrer" onClick={onContact}>Contact agent for this lodge <IconArrow /></a>
              )}
              <button type="button" className={`${btnGhostLight} w-full`} onClick={unbook}>Unbook</button>
            </div>
          </div>
        ) : full ? (
          <div className={`${card} flex flex-col justify-between gap-5 p-6`}>
            <div>
              <h3 className={h3}>Fully booked</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-plum-200">Every apartment here has been taken. Show interest to hear when one frees up.</p>
            </div>
            <button type="button" className={`${btnPlum} w-full`} disabled>Fully booked</button>
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-5 rounded-2xl bg-plum p-6 text-white shadow-[0_8px_30px_rgba(43,16,67,0.3)]">
            <div>
              <h3 className="font-bai text-[20px] font-bold text-amber">Ready to take it? Book</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
                {`Booking holds one of the ${lodge.units_available} available apartment${lodge.units_available > 1 ? "s" : ""}. You'll sign in first so we can keep track of your booking.`}
              </p>
            </div>
            <button type="button" className={`${btnAmber} w-full`} onClick={startBook}>Book this lodge <IconArrow /></button>
          </div>
        )}
      </section>

      {authOpen && (
        <AuthModal reason="Sign in to book this lodge." onClose={() => setAuthOpen(false)}
          onSuccess={() => { setAuthOpen(false); setModal("booking"); }} />
      )}
      {modal && <RequestModal lodge={lodge} type={modal} user={user} onClose={() => setModal(null)} onDone={refresh} />}
    </div>
  );
}
