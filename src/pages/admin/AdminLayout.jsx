import { NavLink, Outlet } from "react-router-dom";
import { cx } from "../../components/ui.jsx";

const LINKS = [
  ["/admin", "Bookings", true],
  ["/admin/requests", "Lodge requests"],
  ["/admin/interests", "Interests"],
  ["/admin/lodges", "Manage lodges"],
  ["/admin/agents", "Agents"],
  ["/admin/stats", "Stat categories"],
];

// TODO before production: protect this route and change admin_check() in supabase/v2-migration.sql.
export default function AdminLayout() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {LINKS.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx("flex min-h-11 items-center rounded-lg border px-4 font-bold no-underline", isActive ? "border-ink bg-ink text-white" : "border-line bg-white")}>
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </>
  );
}
