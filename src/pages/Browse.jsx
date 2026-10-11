import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { hasStat, statusRank } from "../lib/constants.js";
import { useLodgeList } from "../lib/LodgeListContext.jsx";
import LodgeCard from "../components/LodgeCard.jsx";
import FeaturedLodge from "../components/FeaturedLodge.jsx";
import FilterPanel, { countActive, emptyFilters } from "../components/FilterPanel.jsx";
import { SectionPill, btnOutline, btnPlum } from "../components/lodgeUi.jsx";
import { IconArrow } from "../components/lodgeIcons.jsx";

export default function Browse() {
  const { setIds } = useLodgeList();
  const [lodges, setLodges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false); // starts collapsed; set true to start open

  useEffect(() => {
    supabase
      .from("lodges_with_stats")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("Could not load lodges. Check your connection and refresh.");
        else setLodges(data);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(() => {
    const { area, minPrice, maxPrice, minRooms, features, hideBooked } = filters;
    return lodges.filter((l) =>
      (area === "" || l.location === area) &&
      (minPrice === "" || l.price_yearly >= Number(minPrice)) &&
      (maxPrice === "" || l.price_yearly <= Number(maxPrice)) &&
      (minRooms === "" || l.rooms >= Number(minRooms)) &&
      features.every((f) => hasStat(l, f)) &&
      !(hideBooked && l.units_available === 0)
    );
  }, [lodges, filters]);

  // How much is still free right now (all live lodges, ignoring the filters)
  const availability = useMemo(() => ({
    apartments: lodges.reduce((n, l) => n + (l.units_available || 0), 0),
    lodges: lodges.filter((l) => l.units_available > 0).length,
  }), [lodges]);

  // Newest lodge that still has space, shown in the hero
  const featured = useMemo(() => lodges.find((l) => l.units_available > 0) ?? null, [lodges]);

  // Area dropdown: only areas that have a live lodge
  const areaOptions = useMemo(
    () => [...new Set(lodges.map((l) => l.location).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [lodges]
  );

  // Feature chips come from the stats the lodges actually have
  const statOptions = useMemo(() => {
    const m = new Map();
    lodges.forEach((l) => (l.stats ?? []).forEach((s) => {
      const k = s.name.toLowerCase();
      if (!m.has(k)) m.set(k, { key: k, name: s.name, status: s.status });
    }));
    return [...m.values()].sort((a, b) => statusRank(b.status) - statusRank(a.status) || a.name.localeCompare(b.name));
  }, [lodges]);

  // Lets the detail page step Previous / Next through exactly this list.
  useEffect(() => { if (!loading) setIds(visible.map((l) => l.id)); }, [visible, loading, setIds]);

  const stat = (n) => (loading || error ? "–" : n);
  const showFilters = () => {
    setFiltersOpen(true);
    document.getElementById("lodges")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="font-pop">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[20px] border border-plum/10 bg-white">
        <div aria-hidden className="dot-grid absolute inset-0" />
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(55% 70% at -5% 70%, rgba(255,178,52,0.14) 0%, rgba(0,0,0,0) 55%)" }} />
        <div className={`relative grid items-center gap-10 px-6 py-10 md:px-10 md:py-14 ${featured ? "md:grid-cols-[1.15fr_1fr]" : ""}`}>
          <div>
            <SectionPill>Student housing · FUT Minna</SectionPill>
            <h1 className="mt-5 font-bai text-[40px] font-bold uppercase leading-[1.05] tracking-[-0.5px] text-plum md:text-[56px]">
              Find your <span className="clarity-text-gradient">lodge</span> near campus
            </h1>
            <p className="mt-5 max-w-[470px] text-[15px] leading-[1.7] text-plum-100 md:text-[16px]">
              Watch video tours, compare yearly prices and book an apartment near FUT Minna, all online.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#lodges" className={btnPlum}>Browse lodges <IconArrow /></a>
              <button type="button" className={btnOutline} onClick={showFilters}>Filter your search</button>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-8 gap-y-4 border-t border-plum/10 pt-6" aria-live="polite">
              {[[stat(availability.apartments), "Apartments available"], [stat(availability.lodges), "Lodges with space"], [stat(areaOptions.length), "Areas"]].map(([v, label]) => (
                <li key={label}>
                  <div className="font-bai text-[22px] font-bold leading-tight text-plum">{v}</div>
                  <div className="font-jet text-[11px] uppercase tracking-[0.55px] text-plum-300">{label}</div>
                </li>
              ))}
            </ul>
          </div>
          {featured && <FeaturedLodge lodge={featured} />}
        </div>
      </section>

      {/* Listings */}
      <div id="lodges" className="mt-12 scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionPill>All lodges</SectionPill>
            <h2 className="mt-3 font-bai text-[30px] font-bold uppercase leading-none tracking-[-0.5px] text-plum">
              Browse <span className="text-violet">lodges</span>
            </h2>
          </div>
          {!loading && !error && (
            <p className="font-jet text-[12px] text-plum-300">
              Showing <strong className="text-plum">{visible.length}</strong> of {lodges.length}
              {countActive(filters) > 0 && " · filters on"}
            </p>
          )}
        </div>

        <FilterPanel filters={filters} onChange={setFilters} options={statOptions} areaOptions={areaOptions} open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} />

        {loading && <p className="py-8 font-jet text-[13px] text-plum-300">Loading lodges…</p>}
        {error && <p className="py-8 text-booked">{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <div className="rounded-2xl border border-plum/10 bg-white p-8 text-center shadow-[0_2px_14px_rgba(43,16,67,0.06)]">
            <p className="font-bai text-[18px] font-bold text-plum">No lodges match those filters</p>
            <p className="mt-1 text-[13px] text-plum-200">Try a wider price range or fewer features.</p>
            <button type="button" className={`${btnOutline} mt-4`} onClick={() => setFilters(emptyFilters)}>Clear filters</button>
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] items-start gap-x-6 gap-y-8">
          {visible.map((l) => <LodgeCard key={l.id} lodge={l} />)}
        </div>
      </div>
    </div>
  );
}
