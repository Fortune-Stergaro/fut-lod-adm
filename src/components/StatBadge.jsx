import { STATUSES } from "../lib/constants.js";

const COLORS = {
  essential: "border-plum/15 bg-plum/5 text-plum-100",
  convenient: "border-violet/30 bg-violet/10 text-violet",
  premium: "border-amber bg-amber text-plum",
};

export default function StatBadge({ status }) {
  const label = STATUSES.find((s) => s.key === status)?.label ?? status;
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-jet text-[0.62rem] font-bold uppercase tracking-wider ${COLORS[status] ?? COLORS.essential}`}>
      {label}
    </span>
  );
}
