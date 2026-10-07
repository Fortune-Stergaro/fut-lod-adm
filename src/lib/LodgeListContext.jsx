import { createContext, useContext, useMemo, useState } from "react";

// Remembers the browse page's current order (after filters and sorting)
// so the detail page can offer Previous / Next through that same list.
const Ctx = createContext({ ids: [], setIds: () => {} });

export function LodgeListProvider({ children }) {
  const [ids, setIds] = useState([]);
  const value = useMemo(() => ({ ids, setIds }), [ids]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLodgeList = () => useContext(Ctx);
