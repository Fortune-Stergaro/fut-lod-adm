import { Link } from "react-router-dom";
import { AGENT } from "../lib/constants.js";

// Site footer: brand, where to go, and who to call
export default function Footer() {
  const head = "font-jet text-[10px] font-bold uppercase tracking-[1.5px] text-amber/80";
  const link = "block py-1 text-[14px] text-white/80 no-underline hover:text-white";
  return (
    <footer className="mt-auto bg-plum-2 px-6 pb-6 pt-12 text-white">
      <div className="mx-auto grid max-w-[1120px] gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-[1.25rem] font-bold uppercase tracking-[-0.3px]">Futminna Lodges</p>
          <p className="mt-3 max-w-[320px] text-[14px] leading-relaxed text-white/70">Find, compare and book student lodges near FUT Minna. Watch the video, call the agent, then book.</p>
        </div>
        <nav aria-label="Explore">
          <h6 className={head}>Explore</h6>
          <div className="mt-2">
            <Link to="/" className={link}>Browse lodges</Link>
            <Link to="/my-bookings" className={link}>My bookings</Link>
            <Link to="/agent" className={link}>Agent portal</Link>
          </div>
        </nav>
        <div>
          <h6 className={head}>Talk to us</h6>
          <div className="mt-2">
            <p className="py-1 text-[14px] text-white/80">{AGENT.name}</p>
            <a className={link} href={AGENT.callHref}>{AGENT.phone}</a>
            <a className={link} href={`https://wa.me/${AGENT.whatsappIntl}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 flex max-w-[1120px] flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 font-jet text-[11px] text-white/40">
        <span>© {new Date().getFullYear()} Futminna Lodges</span>
        <span>Student housing near the Federal University of Technology, Minna</span>
      </p>
    </footer>
  );
}
