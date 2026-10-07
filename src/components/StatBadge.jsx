import { STATUSES } from "../lib/constants.js";

const COLORS = {
  essential: "border-[#c9d0d5] bg-silver-soft text-[#4b555c]",
  convenient: "border-[#ecd68f] bg-gold-soft text-gold",
  premium: "border-premium bg-premium text-white",
};

export default function StatBadge({ status }) {
  const label = STATUSES.find((s) => s.key === status)?.label ?? status;
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${COLORS[status] ?? COLORS.essential}`}>
      {label}
    </span>
  );
}
