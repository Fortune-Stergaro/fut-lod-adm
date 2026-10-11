import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

// Anonymous visit counting (read by the owner's analytics): a random id kept in this browser, the page path, the time.
// No IP address, no name or email. Delete this file and its <Tracker /> line in App.jsx to switch counting off.
const ID_KEY = "lodges:visitor";
const PING_MS = 4 * 60 * 1000; // "still here" signal while the tab is open

function visitorId() {
  try {
    let v = localStorage.getItem(ID_KEY);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(ID_KEY, v); }
    return v;
  } catch { return null; }
}

// Never record secret link tokens
const clean = (path) => path.replace(/^\/connect\/.*/, "/connect/*");

function send(path, kind) {
  try {
    const id = visitorId();
    if (!id) return;
    supabase.rpc("track_visit", { p_visitor: id, p_path: clean(path), p_kind: kind }).then(() => {}, () => {});
  } catch { /* tracking must never break the site */ }
}

export default function Tracker() {
  const { pathname } = useLocation();

  useEffect(() => { send(pathname, "view"); }, [pathname]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") send(window.location.pathname, "ping"); }, PING_MS);
    return () => clearInterval(t);
  }, []);
  return null;
}
