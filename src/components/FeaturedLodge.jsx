import { Link } from "react-router-dom";
import { naira } from "../lib/constants.js";
import { StatusPill, UnitBar, btnPlum } from "./lodgeUi.jsx";
import { IconArrow } from "./lodgeIcons.jsx";

// Hero side card: the newest lodge that still has space
export default function FeaturedLodge({ lodge }) {
  const month = lodge.created_at ? new Date(lodge.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : "";
  const bits = [lodge.location, `${lodge.rooms} room${lodge.rooms > 1 ? "s" : ""}`, `${lodge.units_total} apartment${lodge.units_total > 1 ? "s" : ""}`].filter(Boolean);
  return (
    <aside aria-label="Newest available lodge" className="hidden overflow-hidden rounded-2xl bg-white shadow-[0_4px_4px_rgba(0,0,0,0.08),0_16px_50px_rgba(43,16,67,0.18)] md:block">
      <div className="bg-plum px-6 pb-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-jet text-[10px] font-bold uppercase tracking-[1.5px] text-white/45">
            <span>Newest with space</span>
            {month && <><span className="size-0.5 rounded-full bg-white/45" /><span>{month}</span></>}
          </div>
          <StatusPill lodge={lodge} />
        </div>
        <h2 className="mt-4 font-bai text-[26px] font-bold uppercase leading-[1.1] tracking-[-0.5px] text-amber">{lodge.name}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 font-pop text-[13px] text-plum-300">
          {bits.map((b, i) => (
            <span key={b} className="flex items-center gap-2">{b}{i < bits.length - 1 && <span className="size-[3px] rounded-full bg-plum-300" />}</span>
          ))}
        </p>
      </div>
      <div className="p-5">
        <div className="font-bai text-[10px] font-semibold uppercase tracking-[1px] text-[#9E9E9E]">From, per year</div>
        <div className="mt-1 font-bai text-[30px] font-bold leading-none text-plum">{naira(lodge.price_yearly)}</div>
        <div className="mt-4"><UnitBar lodge={lodge} /></div>
        <Link to={`/lodge/${lodge.id}`} className={`${btnPlum} mt-5 w-full`}>View this lodge <IconArrow /></Link>
      </div>
    </aside>
  );
}
