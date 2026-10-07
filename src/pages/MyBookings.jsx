import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { lodgeTitle } from "../lib/constants.js";
import AuthModal from "../components/AuthModal.jsx";
import { Btn, Panel, Tag } from "../components/ui.jsx";

const LABELS = { active: "Booked", unbooked: "Unbooked", revoked: "Revoked", sold: "Sold" };
const TONE = { active: "free", sold: "sold", unbooked: "booked", revoked: "booked" };

export default function MyBookings() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!user) return setRows(null);
    supabase.from("bookings").select("id, status, created_at, lodges(id, name, lodge_name)")
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
      <h1 className="font-display text-2xl">My bookings</h1>
      {rows === null && <p className="py-8 text-muted">Loading…</p>}
      {rows?.length === 0 && <p className="py-8 text-muted">You haven't booked a lodge yet. <Link to="/" className="underline">Browse lodges</Link></p>}
      <div className="mt-4 grid gap-4">
        {rows?.map((b) => (
          <Link key={b.id} to={`/lodge/${b.lodges.id}`} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-5 no-underline">
            <strong>{lodgeTitle(b.lodges)}</strong>
            <Tag tone={TONE[b.status]}>{LABELS[b.status]}</Tag>
            <span className="ml-auto text-[0.92rem] text-muted">{new Date(b.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
