export const AGENT = {
  name: "Obe Fortune",
  phone: "0800 000 0000",          // TODO: real number
  whatsapp: "0800 000 0000",       // TODO: real number
  whatsappIntl: "2348000000000",   // digits only, with country code, for wa.me links
  callHref: "tel:+2348000000000",
};


export const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");

// Roles shown on the special agent-connect page
export const ROLES = { client: "Client", coordinator: "Coordinator", agent: "Lodge agent" };

// "Fortune Lodge" (lodge_name) is the title; name is the apartment type. Old rows fall back to name.
export const lodgeTitle = (l) => l.lodge_name || l.name;

// Make a phone number usable in wa.me links (Nigerian numbers starting 0 become 234...)
export const waNumber = (n) => {
  const d = String(n || "").replace(/\D/g, "");
  return d.startsWith("0") ? "234" + d.slice(1) : d;
};

// Stats: { name, status, available }. Status colours: essential = silver, convenient = gold, premium = purple.
export const STATUSES = [
  { key: "essential", label: "Essential" },
  { key: "convenient", label: "Convenient" },
  { key: "premium", label: "Premium" },
];
export const statusRank = (s) => STATUSES.findIndex((x) => x.key === s);
export const hasStat = (lodge, name) =>
  (lodge.stats ?? []).some((s) => s.available && s.name.toLowerCase() === String(name).toLowerCase());
export const premiumStats = (lodge) => (lodge.stats ?? []).filter((s) => s.status === "premium" && s.available);

export const VIDEO_BUCKET = "lodge-videos";
