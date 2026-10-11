import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const PW_KEY = "lodges:pendingPassword";
// Remember that this email still has to choose a password after clicking the verification link
export const markPendingPassword = (email) => localStorage.setItem(PW_KEY, email.trim().toLowerCase());

const Ctx = createContext({ user: null, loading: true, agent: null, needsPassword: false, passwordSet: () => {}, signOut: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState(null);       // undefined = checking, null = not an agent
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setAgent(null); setNeedsPassword(false); return; }
    setNeedsPassword(localStorage.getItem(PW_KEY) === user.email?.toLowerCase());
    setAgent(undefined);
    let alive = true;
    supabase.rpc("my_agent").then(({ data }) => { if (alive) setAgent(data ?? null); });
    return () => { alive = false; };
  }, [user?.id]);

  const passwordSet = () => { localStorage.removeItem(PW_KEY); setNeedsPassword(false); };

  return (
    <Ctx.Provider value={{ user, loading, agent, needsPassword, passwordSet, signOut: () => supabase.auth.signOut() }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
