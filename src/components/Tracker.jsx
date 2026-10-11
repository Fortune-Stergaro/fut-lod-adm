import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";

// Anonymous visit counting for the admin analytics page: a random id kept in this browser, the page path, the time.
// No IP address, no name or email. Admins are never counted.
const ID_KEY = "lodges:visitor";
const SKIP_KEY = "lodges:noTrack";
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
    if (path.startsWith("/admin") || localStorage.getItem(SKIP_KEY)) return;
    const id = visitorId();
    if (!id) return;
    supabase.rpc("track_visit", { p_visitor: id, p_path: clean(path), p_kind: kind }).then(() => {}, () => {});
  } catch { /* tracking must never break the site */ }
}

export default function Tracker() {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();

  useEffect(() => { if (isAdmin) try { localStorage.setItem(SKIP_KEY, "1"); } catch { /* ignore */ } }, [isAdmin]);
  useEffect(() => { send(pathname, "view"); }, [pathname]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") send(window.location.pathname, "ping"); }, PING_MS);
    return () => clearInterval(t);
  }, []);
  return null;
}
