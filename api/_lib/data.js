// Read-only Supabase REST helpers for the edge functions (public view only, anon key).
const env = (k) => (typeof process !== "undefined" && process.env ? process.env[k] : undefined);
const supaUrl = () => (env("VITE_SUPABASE_URL") || env("SUPABASE_URL") || "").replace(/\/+$/, "");
const supaKey = () => env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY") || "";

async function rest(query) {
  const url = supaUrl();
  const key = supaKey();
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Live number of apartments still available across all approved lodges.
export async function getHomeData() {
  const rows = await rest("lodges_with_stats?select=id,units_available");
  if (!Array.isArray(rows)) return { count: null, lodges: null };
  return { count: rows.reduce((sum, r) => sum + (Number(r.units_available) || 0), 0), lodges: rows.length };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getLodge(id) {
  if (!UUID.test(id || "")) return null;
  const rows = await rest(
    `lodges_with_stats?id=eq.${id}&select=id,lodge_name,name,location,rooms,units_total,units_available,price_first_year,price_yearly,stats&limit=1`
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function getLodgeIds() {
  const rows = await rest("lodges_with_stats?select=id&order=created_at.desc");
  return Array.isArray(rows) ? rows.map((r) => r.id) : [];
}

export { env };
