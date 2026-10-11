import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Browse from "./pages/Browse.jsx";
import LodgeDetail from "./pages/LodgeDetail.jsx";
import ConnectPage from "./pages/ConnectPage.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import AgentGate from "./pages/agent/AgentGate.jsx";
import AgentLodges from "./pages/agent/AgentLodges.jsx";
import AgentLodgeForm from "./pages/agent/AgentLodgeForm.jsx";
import AdminGate from "./pages/admin/AdminGate.jsx";
import NotFound from "./pages/NotFound.jsx";
import Tracker from "./components/Tracker.jsx";
import Footer from "./components/Footer.jsx";
import AuthModal from "./components/AuthModal.jsx";
import SetPasswordModal from "./components/SetPasswordModal.jsx";
import InstallButton from "./components/InstallButton.jsx";
import { LinkBtn } from "./components/ui.jsx";
import { LodgeListProvider } from "./lib/LodgeListContext.jsx";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";

// Admin screens are a separate chunk: only downloaded once the user is confirmed as an admin
const AdminRoutes = lazy(() => import("./pages/admin/AdminRoutes.jsx"));

function SiteHeader() {
  const { user, agent, isAdmin, needsPassword, signOut } = useAuth();
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
        <div className="flex min-h-8 items-center gap-4 bg-plum-2 px-4 text-[0.8rem] text-plum-300">
          <span>Signed in as <strong className="font-bold text-white">{user.email}</strong></span>
          <span className="grow" />
          <Link to="/my-bookings" className="text-white">My bookings</Link>
          {agent && <Link to="/agent" className="font-bold text-white">Agent portal</Link>}
          <LinkBtn onClick={signOut}>Sign out</LinkBtn>
        </div>
      )}
      <div className="flex min-h-15 items-center justify-between bg-plum px-4 py-3.5 text-white">
        <Link to="/" className="font-bai text-[1.35rem] font-bold uppercase tracking-[-0.3px] no-underline">Futminna Lodges</Link>
        <div className="flex items-center gap-4">
          <InstallButton />
          {!user && (
            <button className="min-h-10 cursor-pointer rounded-lg border border-white/30 px-4 text-[0.85rem] font-bold text-white" onClick={() => setAuthOpen(true)}>Sign in</button>
          )}
          {isAdmin && <Link to="/admin" className="text-[0.85rem] opacity-70">Admin</Link>}
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
        <div className="flex min-h-screen flex-col">
        <Tracker />
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-16 pt-5">
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
            <Route path="/admin/*" element={
              <AdminGate>
                <Suspense fallback={<p className="py-8 text-muted">Loading…</p>}><AdminRoutes /></Suspense>
              </AdminGate>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        </div>
      </LodgeListProvider>
    </AuthProvider>
  );
}
