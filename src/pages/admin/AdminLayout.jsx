import { NavLink, Outlet } from "react-router-dom";
import { cx } from "../../components/ui.jsx";

const LINKS = [
  ["/admin", "Bookings", true],
  ["/admin/analytics", "Analytics"],
  ["/admin/requests", "Lodge requests"],
  ["/admin/interests", "Interests"],
  ["/admin/lodges", "Manage lodges"],
  ["/admin/agents", "Agents"],
  ["/admin/areas", "Areas"],
  ["/admin/stats", "Stat categories"],
];

// Only rendered for signed-in admins (see AdminGate and supabase/v5-migration.sql).
export default function AdminLayout() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {LINKS.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx("flex min-h-11 items-center rounded-full border px-4 font-display text-[13px] font-bold no-underline transition", isActive ? "border-plum bg-plum text-white shadow-[0_4px_14px_rgba(43,16,67,0.25)]" : "border-plum/15 bg-white text-ink hover:border-plum/40")}>
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </>
  );
}
