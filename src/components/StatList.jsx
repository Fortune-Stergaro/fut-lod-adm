import { statusRank } from "../lib/constants.js";
import StatBadge from "./StatBadge.jsx";

const ICON = {
  essential: "bg-plum/10 text-plum-100",
  convenient: "bg-violet/15 text-violet",
  premium: "bg-amber text-plum",
};

// The "What it has" list on the lodge page and the agent link page.
export default function StatList({ stats }) {
  const sorted = [...(stats ?? [])].sort(
    (a, b) => Number(b.available) - Number(a.available) || statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name)
  );
  if (sorted.length === 0) return <p className="mt-1 text-[0.92rem] text-muted">No details listed yet.</p>;
  return (
    <ul className="m-0 mt-3 grid list-none gap-1 p-0 sm:grid-cols-2 sm:gap-x-3">
      {sorted.map((s) => (
        <li key={s.name} className="flex min-h-9 flex-wrap items-center gap-2.5 text-[0.95rem]">
          <span aria-hidden className={`inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[0.7rem] font-extrabold ${s.available ? ICON[s.status] : "bg-line-soft"}`}>
            {s.available ? "✓" : "✕"}
          </span>
          <span className={s.available ? (s.status === "premium" ? "font-bold text-[#8A5A00]" : "") : "text-plum-300 line-through"}>{s.name}</span>
          <span className={s.available ? "" : "opacity-50"}><StatBadge status={s.status} /></span>
          {!s.available && <span className="sr-only"> (not available)</span>}
        </li>
      ))}
    </ul>
  );
}
