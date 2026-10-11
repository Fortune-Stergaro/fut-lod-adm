import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import AuthModal from "../components/AuthModal.jsx";
import { Btn, Panel, Tag } from "../components/ui.jsx";
import { SectionPill, btnPlum } from "../components/lodgeUi.jsx";
import { IconBuilding } from "../components/lodgeIcons.jsx";

const LABELS = { active: "Booked", unbooked: "Unbooked", revoked: "Revoked", sold: "Sold" };
const TONE = { active: "free", sold: "sold", unbooked: "booked", revoked: "booked" };

export default function MyBookings() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!user) return setRows(null);
    supabase.from("bookings").select("id, status, created_at, lodges(id, name, location)")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [user]);

  if (loading) return <p className="py-8 text-muted">Loading…</p>;
  if (!user) {
    return (
      <Panel className="mx-auto my-8 grid max-w-[400px] content-start gap-4">
        <h1 className="font-display text-2xl">My bookings</h1>
        <p className="text-[0.92rem] text-muted">Sign in to see the lodges you've booked.</p>
        <Btn variant="primary" onClick={() => setAuthOpen(true)}>Sign in</Btn>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />}
      </Panel>
    );
  }

  return (
    <>
      <SectionPill>Your account</SectionPill>
      <h1 className="mt-3 font-display text-[1.9rem] font-bold leading-tight text-ink">My bookings</h1>
      {rows === null && <p className="py-8 text-muted">Loading…</p>}
      {rows?.length === 0 && (
        <Panel className="mt-5 text-center">
          <p className="font-display text-lg font-bold text-ink">No bookings yet</p>
          <p className="mt-1 text-[0.92rem] text-muted">When you book a lodge, it shows up here.</p>
          <Link to="/" className={`${btnPlum} mt-4`}>Browse lodges</Link>
        </Panel>
      )}
      <div className="mt-5 grid gap-3.5">
        {rows?.map((b) => (
          <Link key={b.id} to={`/lodge/${b.lodges.id}`}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-plum/10 bg-white p-4 no-underline shadow-[0_2px_14px_rgba(43,16,67,0.06)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-violet/10 text-violet"><IconBuilding width={20} height={20} /></span>
            <div className="min-w-0">
              <strong className="block font-display text-[1.05rem] text-ink">{b.lodges.name}</strong>
              <span className="font-jet text-[11px] text-plum-300">{b.lodges.location ? `${b.lodges.location} · ` : ""}{new Date(b.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
            </div>
            <Tag tone={TONE[b.status]} pill className="ml-auto">{LABELS[b.status]}</Tag>
          </Link>
        ))}
      </div>
    </>
  );
}
