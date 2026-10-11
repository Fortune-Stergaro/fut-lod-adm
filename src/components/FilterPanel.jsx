import { LinkBtn } from "./ui.jsx";

export const emptyFilters = { area: "", minPrice: "", maxPrice: "", minRooms: "", features: [], hideBooked: false };

export const countActive = (f) =>
  (f.area !== "" ? 1 : 0) + (f.minPrice !== "" ? 1 : 0) + (f.maxPrice !== "" ? 1 : 0) + (f.minRooms !== "" ? 1 : 0) +
  f.features.length + (f.hideBooked ? 1 : 0);

const DOCK = "sticky top-[var(--header-h,64px)] z-20 -mx-4 mb-5 bg-paper/95 px-4 pb-3 pt-2.5 backdrop-blur";
const LABEL = "flex flex-col gap-1.5 font-jet text-[10px] font-bold uppercase tracking-[0.8px] text-plum-300";
const INPUT = "min-h-11 w-full rounded-[10px] border border-plum/15 bg-white px-3 font-pop text-[14px] normal-case tracking-normal text-plum";

// Feature chip colours: premium = amber, convenient = violet, essential = plum. Filled when selected.
const CHIP = {
  premium: ["border-amber/50 bg-white text-[#8A5A00]", "border-amber bg-amber text-plum"],
  convenient: ["border-violet/30 bg-white text-violet", "border-violet bg-violet text-white"],
  essential: ["border-plum/20 bg-white text-plum-100", "border-plum bg-plum text-white"],
};
const chip = (status, on) => `cursor-pointer rounded-full border px-3.5 py-1.5 font-jet text-[11px] font-semibold ${(CHIP[status] ?? CHIP.essential)[on ? 1 : 0]}`;

// `options` = feature chips built from the stats the lodges actually have: [{ key, name, status }]
export default function FilterPanel({ filters, onChange, open, onToggle, options = [], areaOptions = [] }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleFeature = (key) =>
    set({ features: filters.features.includes(key) ? filters.features.filter((k) => k !== key) : [...filters.features, key] });
  const active = countActive(filters);

  if (!open) {
    return (
      <div className={DOCK}>
        <button type="button" onClick={onToggle} aria-expanded="false"
          className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border border-plum/25 bg-white px-5 font-bai text-[13px] font-bold text-plum shadow-[0_2px_14px_rgba(43,16,67,0.08)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 5h18M6 12h12M10 19h4" /></svg>
          Filter your search
          {active > 0 && <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-plum font-jet text-[11px] text-white">{active}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={DOCK}>
      <section aria-label="Filter lodges"
        className="max-h-[calc(100vh-var(--header-h,64px)-2rem)] overflow-auto rounded-2xl border border-plum/15 bg-white p-5 shadow-[0_4px_20px_rgba(43,16,67,0.12)]">
        <div className="mb-4 flex items-center justify-between">
          <strong className="font-bai text-[15px] text-plum">Filter your search</strong>
          <LinkBtn className="font-jet text-[11px] text-plum-300" onClick={onToggle} aria-expanded="true">Collapse ▲</LinkBtn>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3">
          <label className={LABEL}>Area
            <select className={INPUT} value={filters.area} onChange={(e) => set({ area: e.target.value })}>
              <option value="">All areas</option>
              {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className={LABEL}>Min price (per year)
            <input className={INPUT} type="number" min="0" inputMode="numeric" value={filters.minPrice} onChange={(e) => set({ minPrice: e.target.value })} placeholder="0" />
          </label>
          <label className={LABEL}>Max price (per year)
            <input className={INPUT} type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} placeholder="Any" />
          </label>
          <label className={LABEL}>Rooms (at least)
            <input className={INPUT} type="number" min="1" inputMode="numeric" value={filters.minRooms} onChange={(e) => set({ minRooms: e.target.value })} placeholder="Any" />
          </label>
          <label className="flex flex-row items-center gap-2 pb-2.5 font-pop text-[13px] font-semibold text-plum">
            <input type="checkbox" className="size-4 accent-plum" checked={filters.hideBooked} onChange={(e) => set({ hideBooked: e.target.checked })} />
            Hide fully booked lodges
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Features">
          {options.map((o) => (
            <button key={o.key} type="button" className={chip(o.status, filters.features.includes(o.key))}
              aria-pressed={filters.features.includes(o.key)} onClick={() => toggleFeature(o.key)}>
              {o.name}
            </button>
          ))}
          <LinkBtn className="font-jet text-[11px] text-plum-300" onClick={() => onChange(emptyFilters)}>Clear filters</LinkBtn>
        </div>
      </section>
    </div>
  );
}
