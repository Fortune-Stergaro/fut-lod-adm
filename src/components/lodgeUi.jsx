// Shared pieces for the redesigned Browse and Lodge pages (deep plum + amber, Bai Jamjuree / Poppins / JetBrains Mono).
import { statusRank } from "../lib/constants.js";

// ----- buttons (class strings) -----
const B = "inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3 font-bai text-[13px] font-bold no-underline cursor-pointer transition disabled:cursor-not-allowed disabled:opacity-50";
export const btnPlum = `${B} bg-plum text-white shadow-[0_4px_14px_rgba(43,16,67,0.35)] hover:bg-plum-2`;
export const btnOutline = `${B} border border-plum/25 bg-white text-plum hover:bg-plum/5`;
export const btnAmber = `${B} bg-amber text-plum shadow-[0_4px_14px_rgba(255,178,52,0.35)] hover:brightness-95`;
export const btnGhostLight = `${B} border border-white/30 text-white hover:bg-white/10`;

// ----- little building blocks -----
export function SectionPill({ children, className = "" }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full border border-plum/20 bg-plum/8 px-3 py-1 font-bai text-[11px] font-bold uppercase tracking-wide text-[#4A1A6E] ${className}`}>
      {children}
    </span>
  );
}

// Available / few left / fully booked, as a coloured dot + label
const STATUS_STYLE = {
  ok: ["bg-[#22C55E1F]", "text-[#15803D]", "bg-ok"],
  few: ["bg-[#F973161F]", "text-[#C2410C]", "bg-warn"],
  full: ["bg-[#1111111F]", "text-[#4b4b4b]", "bg-[#111]"],
};
export function getStatus(l) {
  const n = l.units_available || 0;
  if (n === 0) return { kind: "full", label: "Fully booked" };
  if (n <= 2) return { kind: "few", label: n === 1 ? "Last one" : `${n} left` };
  return { kind: "ok", label: `${n} available` };
}
export function StatusPill({ lodge, className = "" }) {
  const { kind, label } = getStatus(lodge);
  const [bg, text, dot] = STATUS_STYLE[kind];
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 ${bg} ${className}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span className={`font-jet text-[10px] font-bold uppercase tracking-[0.25px] ${text}`}>{label}</span>
    </span>
  );
}

// Feature chips: premium = amber, convenient = violet, essential = plum tint
const CHIP = {
  premium: "border-amber/50 bg-amber/15 text-[#8A5A00]",
  convenient: "border-violet/30 bg-violet/10 text-violet",
  essential: "border-plum/15 bg-plum/5 text-plum-100",
};
export function FeatureChip({ stat, off = false, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-jet text-[10px] font-semibold ${CHIP[stat.status] ?? CHIP.essential} ${off ? "line-through opacity-50" : ""} ${className}`}>
      {stat.name}
    </span>
  );
}

// Premium first, then convenient, then essential
export const sortedStats = (lodge) =>
  [...(lodge.stats ?? [])].sort((a, b) => statusRank(b.status) - statusRank(a.status));

// Colour of the strip along the top of a card: premium = amber, fully booked = grey, otherwise violet
export function accentRgb(l) {
  if ((l.units_available || 0) === 0) return "93,95,94";
  if ((l.stats ?? []).some((s) => s.status === "premium" && s.available)) return "255,178,52";
  return "106,63,160";
}

// A row of blocks: one per apartment (sold = amber, booked = orange, free = green)
export function UnitBar({ lodge }) {
  const total = lodge.units_total || 0, sold = lodge.sold_count || 0, booked = lodge.booked_count || 0, free = lodge.units_available || 0;
  const cls = { sold: "bg-amber", booked: "bg-warn", free: "bg-ok" };
  const label = `${free} free, ${booked} booked, ${sold} sold, out of ${total}`;
  if (total > 24) {
    return (
      <div role="img" aria-label={label} className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {sold > 0 && <div className={cls.sold} style={{ flex: sold }} />}
        {booked > 0 && <div className={cls.booked} style={{ flex: booked }} />}
        {free > 0 && <div className={cls.free} style={{ flex: free }} />}
      </div>
    );
  }
  const cells = [...Array(sold).fill("sold"), ...Array(booked).fill("booked"), ...Array(free).fill("free")];
  return (
    <div role="img" aria-label={label} className="flex h-3 gap-[3px]">
      {cells.map((k, i) => <div key={i} className={`flex-1 rounded-[3px] ${cls[k]}`} />)}
    </div>
  );
}

// "What it has": features grouped Premium > Convenient > Essential, unavailable ones struck through at the end
export function FeatureGroups({ stats }) {
  const all = sortedStats({ stats });
  const groups = [["premium", "Premium"], ["convenient", "Convenient"], ["essential", "Essential"]]
    .map(([key, label]) => ({ key, label, items: all.filter((s) => s.status === key && s.available) }))
    .filter((g) => g.items.length > 0);
  const off = all.filter((s) => !s.available);
  if (groups.length === 0 && off.length === 0) return <p className="mt-4 text-[13px] text-plum-200">No features listed yet.</p>;
  const head = "mb-2 font-jet text-[10px] font-bold uppercase tracking-[1px] text-plum-300";
  return (
    <div className="mt-4 grid gap-5">
      {groups.map((g) => (
        <div key={g.key}>
          <div className={head}>{g.label}</div>
          <div className="flex flex-wrap gap-2">{g.items.map((s) => <FeatureChip key={s.name} stat={s} className="!py-1 !text-[11px]" />)}</div>
        </div>
      ))}
      {off.length > 0 && (
        <div>
          <div className={head}>Not available</div>
          <div className="flex flex-wrap gap-2">{off.map((s) => <FeatureChip key={s.name} stat={s} off className="!py-1 !text-[11px]" />)}</div>
        </div>
      )}
    </div>
  );
}
