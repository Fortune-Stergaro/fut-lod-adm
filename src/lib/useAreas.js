import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// The list of area names for dropdowns (managed by the owner in Admin > Areas)
export function useAreas() {
  const [areas, setAreas] = useState([]);
  useEffect(() => {
    let alive = true;
    supabase.from("areas").select("name").order("name").then(({ data }) => { if (alive && data) setAreas(data.map((a) => a.name)); });
    return () => { alive = false; };
  }, []);
  return areas;
}
