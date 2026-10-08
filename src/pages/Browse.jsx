import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { hasStat, statusRank } from "../lib/constants.js";
import { useLodgeList } from "../lib/LodgeListContext.jsx";
import LodgeCard from "../components/LodgeCard.jsx";
import FilterPanel, { emptyFilters } from "../components/FilterPanel.jsx";

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
    const { minPrice, maxPrice, minRooms, features, hideBooked } = filters;
    return lodges.filter((l) =>
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

  // Stat chips come from the stats the lodges actually have
  const statOptions = useMemo(() => {
    const m = new Map();
    lodges.forEach((l) => (l.stats ?? []).forEach((s) => {
      const k = s.name.toLowerCase();
      if (!m.has(k)) m.set(k, { key: k, name: s.name, status: s.status });
    }));
    return [...m.values()].sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name));
  }, [lodges]);

  // Lets the detail page step Previous / Next through exactly this list.
  useEffect(() => { if (!loading) setIds(visible.map((l) => l.id)); }, [visible, loading, setIds]);

  return (
    <>
      {!loading && !error && (
        <p className="mb-3 inline-flex items-center gap-2.5 rounded-full border border-line bg-white px-4 py-2 text-[0.92rem]" aria-live="polite">
          <span aria-hidden className={`size-2.5 rounded-full ${availability.apartments > 0 ? "bg-green" : "bg-booked"}`} />
          {availability.apartments > 0 ? (
            <span>
              <strong>{availability.apartments}</strong> {availability.apartments === 1 ? "apartment" : "apartments"} available
              {" "}across <strong>{availability.lodges}</strong> {availability.lodges === 1 ? "lodge" : "lodges"}
            </span>
          ) : (
            <span>No apartments available right now. Check back soon.</span>
          )}
        </p>
      )}
      <FilterPanel filters={filters} onChange={setFilters} options={statOptions} open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} />
      {loading && <p className="py-8 text-muted">Loading lodges…</p>}
      {error && <p className="py-8 text-booked">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="py-8 text-muted">No lodges match these filters. Try removing one.</p>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-x-6 gap-y-8">
        {visible.map((l) => <LodgeCard key={l.id} lodge={l} />)}
      </div>
    </>
  );
}
