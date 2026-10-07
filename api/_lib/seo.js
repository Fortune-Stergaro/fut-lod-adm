// Pure helpers: build the <head> tags (title, description, Open Graph, Twitter, JSON-LD) and inject them into the app shell.
import { env } from "./data.js";

export const SITE_NAME = "Futminna Lodges";

export const naira = (n) => "₦" + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const lodgeTitle = (l) => l.lodge_name || l.name;
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const RANK = { premium: 0, convenient: 1, essential: 2 };
export const availableStats = (lodge) =>
  (lodge.stats || [])
    .filter((s) => s && s.available && s.name)
    .sort((a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3));

// Public origin used in canonical / og:url / og:image. Set SITE_URL in Vercel to pin your real domain.
export const siteOrigin = (requestOrigin) => (env("SITE_URL") || requestOrigin).replace(/\/+$/, "");

export function homeMeta(count, site) {
  const has = typeof count === "number" && count > 0;
  const title = has
    ? `${SITE_NAME}: ${plural(count, "apartment", "apartments")} available near FUT Minna`
    : `${SITE_NAME}: find and book lodges near FUT Minna`;
  const description = has
    ? `${count} ${count === 1 ? "apartment is" : "apartments are"} available right now. Watch video tours, compare prices and book your lodge near FUT Minna online. Tap to browse before they're gone!`
    : "Watch video tours, compare prices and book your lodge near FUT Minna online. New apartments are added often. Tap to browse!";
  return {
    title,
    description,
    url: `${site}/`,
    image: `${site}/api/og?v=${typeof count === "number" ? count : "x"}`,
    imageAlt: has ? `${plural(count, "apartment", "apartments")} available on ${SITE_NAME}` : `${SITE_NAME}: lodges near FUT Minna`,
    jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${site}/`, description },
  };
}

export function lodgeMeta(lodge, site) {
  const where = lodge.location ? ` in ${lodge.location}` : "";
  const title = lodge.lodge_name ? `${lodge.lodge_name}: ${lodge.name}${where}` : `${lodge.name}${where}`;
  const stats = availableStats(lodge);
  const free = Number(lodge.units_available) || 0;
  const total = Number(lodge.units_total) || 0;

  const price = `${naira(lodge.price_yearly)}/year`;
  const first = Number(lodge.price_first_year) && lodge.price_first_year !== lodge.price_yearly ? ` (${naira(lodge.price_first_year)} first year)` : "";
  const rooms = lodge.rooms ? `${plural(lodge.rooms, "room", "rooms")} per apartment` : "";
  const avail = free > 0 ? `${free} of ${plural(total, "apartment", "apartments")} available` : "Fully booked";
  const features = stats.length ? `Includes ${stats.slice(0, 5).map((s) => s.name).join(", ")}.` : "";
  const description = clip(
    [`${price}${first}`, rooms, avail].filter(Boolean).join(" · ") + `. ${features} Watch the video tour and book online.`.replace("  ", " "),
    300
  );

  const url = `${site}/lodge/${lodge.id}`;
  const image = `${site}/api/og?id=${lodge.id}&v=${free}-${lodge.price_yearly}`;
  return {
    title,
    description,
    url,
    image,
    imageAlt: `${lodgeTitle(lodge)}: ${price}, ${avail}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      description,
      url,
      image,
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "NGN",
        price: Number(lodge.price_yearly) || 0,
        availability: free > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      },
    },
  };
}

export function renderTags(m) {
  const t = esc(m.title);
  const d = esc(m.description);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_NG" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(m.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${esc(m.image)}" />`,
    `<meta name="twitter:image:alt" content="${esc(m.imageAlt)}" />`,
    `<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}

// Replaces the <!--seo:start-->…<!--seo:end--> block in index.html (or adds the tags before </head>).
export function injectSeo(html, tags) {
  const block = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;
  if (block.test(html)) return html.replace(block, () => tags);
  return html.replace("</head>", () => `${tags}\n  </head>`);
}
