import { Link } from "react-router-dom";
import AutoVideo from "./AutoVideo.jsx";
import { naira } from "../lib/constants.js";
import { FeatureChip, StatusPill, accentRgb, sortedStats } from "./lodgeUi.jsx";
import { IconArrow, IconBed, IconHeart, IconPin } from "./lodgeIcons.jsx";

export default function LodgeCard({ lodge }) {
  const rgb = accentRgb(lodge);
  const feats = sortedStats(lodge).filter((s) => s.available);
  const shown = feats.slice(0, 3);

  return (
    <article>
      <Link
        to={`/lodge/${lodge.id}`}
        className="group relative block overflow-hidden rounded-[14px] border-t border-plum/10 pt-1.5 no-underline shadow-[0_2px_14px_rgba(43,16,67,0.08)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
      >
        <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgb(${rgb}) 0%, rgba(${rgb}, 0.4) 100%)` }} />
        <div className="relative bg-white">
          <div className="relative">
            <AutoVideo src={lodge.video_url} />
            <span className="absolute left-3 top-3 rounded-full bg-white shadow-sm"><StatusPill lodge={lodge} /></span>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3 font-jet text-[10px] font-bold uppercase tracking-[0.25px] text-plum-300">
              <span className="flex min-w-0 items-center gap-1.5">{lodge.location && <><IconPin width={12} height={12} /><span className="truncate">{lodge.location}</span></>}</span>
              <span className="flex items-center gap-1.5"><IconHeart width={12} height={12} />{lodge.interest_count} interested</span>
            </div>
            <h3 className="mt-2 font-bai text-[18px] font-bold leading-tight text-plum">{lodge.name}</h3>
            <div className="mt-3 flex flex-col gap-1.5 font-jet text-[12px] text-plum-300">
              <span className="flex items-center gap-1.5"><IconBed width={13} height={13} />{lodge.rooms} room{lodge.rooms > 1 ? "s" : ""}</span>
              <span><strong className="text-plum">{lodge.booked_count}</strong> of {lodge.units_total} apartment{lodge.units_total > 1 ? "s" : ""} booked{lodge.sold_count > 0 && <> · {lodge.sold_count} sold</>}</span>
            </div>
            {shown.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {shown.map((s) => <FeatureChip key={s.name} stat={s} />)}
                {feats.length > shown.length && <span className="py-0.5 font-jet text-[10px] font-semibold text-plum-300">+{feats.length - shown.length} more</span>}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-plum/8 pt-4">
              <div>
                <span className="font-bai text-[20px] font-bold leading-none text-plum">{naira(lodge.price_yearly)}</span>
                <span className="ml-1 font-jet text-[10px] uppercase text-plum-300">/ year</span>
              </div>
              <span className="flex items-center gap-1.5 font-bai text-[13px] font-bold text-plum">View lodge <IconArrow className="transition-transform group-hover:translate-x-0.5" /></span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
