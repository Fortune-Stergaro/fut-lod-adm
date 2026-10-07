import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Browse from "./pages/Browse.jsx";
import LodgeDetail from "./pages/LodgeDetail.jsx";
import ConnectPage from "./pages/ConnectPage.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import AgentGate from "./pages/agent/AgentGate.jsx";
import AgentLodges from "./pages/agent/AgentLodges.jsx";
import AgentLodgeForm from "./pages/agent/AgentLodgeForm.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminBookings from "./pages/admin/AdminBookings.jsx";
import AdminRequests from "./pages/admin/AdminRequests.jsx";
import AdminReview from "./pages/admin/AdminReview.jsx";
import AdminInterests from "./pages/admin/AdminInterests.jsx";
import AdminLodges from "./pages/admin/AdminLodges.jsx";
import AdminAgents from "./pages/admin/AdminAgents.jsx";
import AdminAgentPage from "./pages/admin/AdminAgentPage.jsx";
import AdminStats from "./pages/admin/AdminStats.jsx";
import AuthModal from "./components/AuthModal.jsx";
import SetPasswordModal from "./components/SetPasswordModal.jsx";
import InstallButton from "./components/InstallButton.jsx";
import { LinkBtn } from "./components/ui.jsx";
import { LodgeListProvider } from "./lib/LodgeListContext.jsx";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";

function SiteHeader() {
  const { user, agent, needsPassword, signOut } = useAuth();
  const ref = useRef(null);
  const [authOpen, setAuthOpen] = useState(false);

  // Tell the CSS how tall the header is so sticky filters sit right under it
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--header-h", el.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="sticky top-0 z-30">
      {user && (
        <div className="flex min-h-8 items-center gap-4 bg-[#0b1511] px-4 text-[0.8rem] text-[#c3d6cd]">
          <span>Signed in as <strong className="font-bold text-white">{user.email}</strong></span>
          <span className="grow" />
          <Link to="/my-bookings" className="text-white">My bookings</Link>
          {agent && <Link to="/agent" className="font-bold text-white">Agent portal</Link>}
          <LinkBtn onClick={signOut}>Sign out</LinkBtn>
        </div>
      )}
      <div className="flex min-h-15 items-center justify-between bg-ink px-4 py-3.5 text-white">
        <Link to="/" className="font-display text-[1.35rem] font-extrabold no-underline">Futminna Lodges</Link>
        <div className="flex items-center gap-4">
          <InstallButton />
          {!user && (
            <button className="min-h-10 cursor-pointer rounded-lg border border-[#6f8a81] px-4 text-[0.85rem] font-bold text-white" onClick={() => setAuthOpen(true)}>Sign in</button>
          )}
          <Link to="/admin" className="text-[0.85rem] opacity-70">Admin</Link>
        </div>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />}
      {needsPassword && <SetPasswordModal />}
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LodgeListProvider>
        <SiteHeader />
        <main className="mx-auto max-w-[1120px] px-4 pb-16 pt-5">
          <Routes>
            <Route path="/" element={<Browse />} />
            <Route path="/lodge/:id" element={<LodgeDetail />} />
            <Route path="/connect/:token" element={<ConnectPage />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/agent" element={<AgentGate />}>
              <Route index element={<AgentLodges />} />
              <Route path="new" element={<AgentLodgeForm />} />
              <Route path="edit/:id" element={<AgentLodgeForm />} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminBookings />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="requests/:id" element={<AdminReview />} />
              <Route path="interests" element={<AdminInterests />} />
              <Route path="lodges" element={<AdminLodges />} />
              <Route path="agents" element={<AdminAgents />} />
              <Route path="agents/:id" element={<AdminAgentPage />} />
              <Route path="stats" element={<AdminStats />} />
            </Route>
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
        </main>
      </LodgeListProvider>
    </AuthProvider>
  );
}
