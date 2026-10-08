import { useEffect, useRef, useState } from "react";
import { cx } from "./ui.jsx";

function legacyCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { /* ignore */ }
  document.body.removeChild(ta);
  return ok;
}

// Copies `url` to the clipboard and says so for a couple of seconds.
export default function CopyLinkButton({ url, className }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch { ok = legacyCopy(url); }
    if (!ok) { window.prompt("Copy this link:", url); return; }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button type="button" onClick={copy}
      className={cx("inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border-2 px-3.5 text-sm font-bold",
        copied ? "border-green bg-green-soft text-green" : "border-ink bg-white text-ink", className)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {copied
          ? <path d="M20 6 9 17l-5-5" />
          : <><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" /></>}
      </svg>
      <span aria-live="polite">{copied ? "Link copied!" : "Copy link"}</span>
    </button>
  );
}
