import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { lodgeTitle } from "../lib/constants.js";
import { Btn, Modal, inputCls, labelCls } from "./ui.jsx";

const COPY = {
  interest: {
    title: "Show interest",
    help: "Leave your details and the agent will call you about this lodge. You are not committing to anything.",
    action: "Send my interest",
  },
  booking: {
    title: "Book this lodge",
    help: "Booking tells us you want to take an apartment here. It holds one apartment for you, and you can unbook later.",
    action: "Book this lodge",
  },
};
const BOOK_ERRORS = {
  full: "Sorry, the last apartment was just booked.",
  already_booked: "You have already booked this lodge.",
  not_signed_in: "Please sign in again.",
  bad_details: "Enter your name and a valid phone number.",
  not_found: "This lodge no longer exists.",
};

export default function RequestModal({ lodge, type, user, onClose, onDone }) {
  const [name, setName] = useState(type === "booking" ? user?.user_metadata?.full_name ?? "" : "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const copy = COPY[type];

  async function submit(e) {
    e.preventDefault();
    setError("");
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!/^\+?\d{10,14}$/.test(cleanPhone)) return setError("Enter a valid phone number.");

    setBusy(true);
    if (type === "interest") {
      const { error } = await supabase.from("requests").insert({
        lodge_id: lodge.id, type: "interest", name: name.trim(), phone: cleanPhone,
      });
      if (error) { setBusy(false); return setError("Could not send. Please try again."); }
    } else {
      const { data, error } = await supabase.rpc("book_unit", {
        p_lodge_id: lodge.id, p_name: name.trim(), p_phone: cleanPhone,
      });
      if (error) { setBusy(false); return setError("Could not book. Please try again."); }
      if (data !== "ok") {
        setBusy(false);
        onDone();
        return setError(BOOK_ERRORS[data] ?? "Could not book. Please try again.");
      }
    }
    setBusy(false);
    setSent(true);
    onDone();
  }

  return (
    <Modal label={copy.title} onClose={onClose}>
      {sent ? (
        <>
          <h2 className="font-display text-xl">{type === "interest" ? "Interest sent" : "Lodge booked"}</h2>
          <p>{type === "interest"
            ? `The agent will call you on ${phone} soon.`
            : "Your apartment is held. We'll be in touch on the number you gave."}</p>
          <Btn variant="primary" onClick={onClose}>Close</Btn>
        </>
      ) : (
        <form onSubmit={submit} className="grid gap-3.5">
          <h2 className="font-display text-xl">{copy.title}</h2>
          <p className="text-[0.92rem] text-muted">{lodgeTitle(lodge)}. {copy.help}</p>
          {type === "booking" && <p className="text-[0.92rem] text-muted">Booking as {user?.email}</p>}
          <label className={labelCls}>Full name
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className={labelCls}>Phone number
            <input className={inputCls} value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" />
          </label>
          {error && <p className="text-booked" role="alert">{error}</p>}
          <div className="flex justify-end gap-2.5">
            <Btn type="button" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" disabled={busy}>{busy ? "Sending…" : copy.action}</Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}
