import { useAuth } from "../../lib/AuthContext.jsx";
import NotFound from "../NotFound.jsx";

// Admin pages only exist for signed-in admins. Everyone else (signed out, normal users, agents) just sees "Page not found",
// so the admin area isn't even revealed. The real protection is in the database (admin_check()); this only hides the screens.
export default function AdminGate({ children }) {
  const { loading, isAdmin, adminChecking } = useAuth();
  if (loading || adminChecking) return null;
  return isAdmin ? children : <NotFound />;
}
