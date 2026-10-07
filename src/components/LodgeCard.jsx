import { Link } from "react-router-dom";
import AutoVideo from "./AutoVideo.jsx";
import { Tag, cx } from "./ui.jsx";
import { naira, lodgeTitle, premiumStats } from "../lib/constants.js";

export default function LodgeCard({ lodge }) {
  const premium = premiumStats(lodge);
  const isPremium = premium.length > 0;
  const full = lodge.units_available === 0;

  return (
    <article>
      <div className="mb-1.5 font-display text-2xl font-extrabold leading-none">
        {naira(lodge.price_yearly)} <span className="font-sans text-[0.8rem] font-medium text-muted">per year</span>
      </div>
      <Link
        to={`/lodge/${lodge.id}`}
        className={cx(
          "block overflow-hidden rounded-[10px] border-2 bg-white no-underline transition-transform hover:-translate-y-0.5 motion-reduce:transition-none",
          isPremium ? "border-premium shadow-[0_0_0_3px_var(--color-premium-soft)]" : "border-ink"
        )}
      >
        <AutoVideo src={lodge.video_url} />
        <div className="px-4 pb-4 pt-3.5">
          <h3 className="font-display text-[1.1rem] leading-tight">{lodgeTitle(lodge)}</h3>
          <p className="mt-1 text-[0.92rem] text-muted">
            {lodge.lodge_name ? `${lodge.name} · ` : ""}
            {lodge.location ? `${lodge.location} · ` : ""}
            {lodge.rooms} room{lodge.rooms > 1 ? "s" : ""}
          </p>
          <p className="mt-2 text-[0.9rem] text-muted">
            <strong className="text-ink">{lodge.booked_count}</strong> of {lodge.units_total} apartment{lodge.units_total > 1 ? "s" : ""} booked
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {premium.map((p) => <Tag key={p.name} tone="premium">{p.name}</Tag>)}
            <Tag>{lodge.interest_count} interested</Tag>
            {lodge.sold_count > 0 && <Tag tone="sold">{lodge.sold_count} sold</Tag>}
            {full ? <Tag tone="booked">Fully booked</Tag> : <Tag tone="free">{lodge.units_available} available</Tag>}
          </div>
        </div>
      </Link>
    </article>
  );
}
