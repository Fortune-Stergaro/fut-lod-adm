import { LinkBtn, inputCls, labelCls, statChip } from "./ui.jsx";

export const emptyFilters = { minPrice: "", maxPrice: "", minRooms: "", features: [], hideBooked: false };

export const countActive = (f) =>
  (f.minPrice !== "" ? 1 : 0) + (f.maxPrice !== "" ? 1 : 0) + (f.minRooms !== "" ? 1 : 0) +
  f.features.length + (f.hideBooked ? 1 : 0);

const DOCK = "sticky top-[var(--header-h,64px)] z-20 -mx-4 mb-5 bg-paper px-4 pb-3 pt-2.5";

// `options` = stat chips built from the stats the lodges actually have: [{ key, name, status }]
export default function FilterPanel({ filters, onChange, open, onToggle, options = [] }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleFeature = (key) =>
    set({
      features: filters.features.includes(key)
        ? filters.features.filter((k) => k !== key)
        : [...filters.features, key],
    });
  const active = countActive(filters);

  // Collapsed: just one button
  if (!open) {
    return (
      <div className={DOCK}>
        <button type="button" onClick={onToggle} aria-expanded="false"
          className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border-2 border-ink bg-white px-5 font-bold text-ink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 5h18M6 12h12M10 19h4" /></svg>
          Filter your search
          {active > 0 && (
            <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-ink text-xs text-white">{active}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={DOCK}>
      <section aria-label="Filter lodges"
        className="max-h-[calc(100vh-var(--header-h,64px)-2rem)] overflow-auto rounded-[10px] border-2 border-ink bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <strong>Filter your search</strong>
          <LinkBtn className="text-[0.85rem] text-muted" onClick={onToggle} aria-expanded="true">Collapse ▲</LinkBtn>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3">
          <label className={labelCls}>
            Min price (per year)
            <input className={inputCls} type="number" min="0" inputMode="numeric" value={filters.minPrice}
              onChange={(e) => set({ minPrice: e.target.value })} placeholder="0" />
          </label>
          <label className={labelCls}>
            Max price (per year)
            <input className={inputCls} type="number" min="0" inputMode="numeric" value={filters.maxPrice}
              onChange={(e) => set({ maxPrice: e.target.value })} placeholder="Any" />
          </label>
          <label className={labelCls}>
            Rooms (at least)
            <input className={inputCls} type="number" min="1" inputMode="numeric" value={filters.minRooms}
              onChange={(e) => set({ minRooms: e.target.value })} placeholder="Any" />
          </label>
          <label className="flex flex-row items-center gap-2 pb-2.5 text-[0.85rem] font-bold">
            <input type="checkbox" className="accent-green" checked={filters.hideBooked}
              onChange={(e) => set({ hideBooked: e.target.checked })} />
            Hide fully booked lodges
          </label>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2" role="group" aria-label="Features">
          {options.map((o) => (
            <button key={o.key} type="button" className={statChip(o.status, filters.features.includes(o.key))}
              aria-pressed={filters.features.includes(o.key)} onClick={() => toggleFeature(o.key)}>
              {o.name}
            </button>
          ))}
          <LinkBtn className="text-[0.85rem] text-muted" onClick={() => onChange(emptyFilters)}>Clear filters</LinkBtn>
        </div>
      </section>
    </div>
  );
}
