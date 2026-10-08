// Generates the 1200x630 preview card shown when a link is shared.
//   /api/og          -> home card with the live "apartments available" number
//   /api/og?id=<id>  -> card for one lodge (name, price, rooms, availability, key features)
// `v` is only a cache-buster in the URL: it changes whenever the numbers change, so WhatsApp/Facebook re-fetch the image.
import { ImageResponse } from "@vercel/og";
import { getHomeData, getLodge } from "./_lib/data.js";
import { availableStats, lodgeTitle, naira } from "./_lib/seo.js";

export const config = { runtime: "edge" };

const boldFont = fetch(new URL("./_fonts/BricolageGrotesque-Bold.ttf", import.meta.url)).then((r) => r.arrayBuffer());
const regularFont = fetch(new URL("./_fonts/BricolageGrotesque-Regular.ttf", import.meta.url)).then((r) => r.arrayBuffer());

const C = { band: "#0f1f1b", band2: "#1e352f", mint: "#a9c9bc", green: "#1f8a66", jade: "#17734a", gold: "#c79200", premium: "#4338ca", silver: "#7b858d", booked: "#b4361f", white: "#ffffff" };

// satori needs display:flex on every element that has more than one child, so every box is a flex box.
const box = (style, ...children) => {
  const kids = children.filter((c) => c !== null && c !== undefined && c !== false);
  return { type: "div", props: { style: { display: "flex", ...style }, children: kids.length === 1 ? kids[0] : kids } };
};
const text = (style, str) => ({ type: "div", props: { style: { display: "flex", ...style }, children: String(str) } });
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

const brand = () =>
  box(
    { alignItems: "center" },
    box({ width: 52, height: 52, borderRadius: 14, background: C.jade, alignItems: "center", justifyContent: "center", color: C.white, fontSize: 26, fontWeight: 700 }, "FL"),
    text({ marginLeft: 16, fontSize: 28, fontWeight: 700, letterSpacing: 3, color: C.mint }, "FUTMINNA LODGES")
  );

const frame = (...children) =>
  box({ width: 1200, height: 630, flexDirection: "column", justifyContent: "space-between", padding: "56px 72px", backgroundImage: `linear-gradient(135deg, ${C.band} 0%, ${C.band2} 100%)`, color: C.white, fontFamily: "Bricolage" }, ...children);

function homeCard(count) {
  const has = typeof count === "number";
  return frame(
    brand(),
    has
      ? box(
          { flexDirection: "column" },
          text({ fontSize: 230, fontWeight: 700, lineHeight: 1, color: C.white }, count),
          text({ fontSize: 66, fontWeight: 700, marginTop: 4 }, count === 1 ? "apartment available now" : "apartments available now"),
          text({ fontSize: 32, marginTop: 20, color: C.mint, fontWeight: 400 }, "Video tours  ·  Clear prices  ·  Book online")
        )
      : box(
          { flexDirection: "column" },
          text({ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }, "Find and book your lodge near FUT Minna"),
          text({ fontSize: 32, marginTop: 24, color: C.mint, fontWeight: 400 }, "Video tours  ·  Clear prices  ·  Book online")
        ),
    box(
      { alignItems: "center" },
      box({ background: C.green, color: C.white, fontSize: 32, fontWeight: 700, padding: "16px 34px", borderRadius: 999 }, "Tap to browse lodges"),
      text({ marginLeft: 24, fontSize: 26, color: C.mint, fontWeight: 400 }, "Near Federal University of Technology, Minna")
    )
  );
}

function lodgeCard(l) {
  const title = lodgeTitle(l);
  const free = Number(l.units_available) || 0;
  const total = Number(l.units_total) || 0;
  const sub = [l.lodge_name ? l.name : null, l.location].filter(Boolean).join("  ·  ");
  const stats = availableStats(l);
  const chipBg = { premium: C.premium, convenient: C.gold, essential: C.silver };
  const shown = stats.slice(0, 6); // already sorted premium > convenient > essential
  const chips = [
    l.rooms ? box({ border: `2px solid ${C.mint}`, color: C.white, fontSize: 26, fontWeight: 700, padding: "8px 20px", borderRadius: 999, marginRight: 12, marginBottom: 12 }, `${l.rooms} room${l.rooms === 1 ? "" : "s"}`) : null,
    ...shown.map((s) => box({ background: chipBg[s.status] || C.silver, color: C.white, fontSize: 25, fontWeight: 700, padding: "7px 18px", borderRadius: 999, marginRight: 12, marginBottom: 12 }, clip(s.name, 22))),
    stats.length > shown.length ? box({ color: C.mint, fontSize: 26, padding: "8px 8px", marginBottom: 12 }, `+${stats.length - shown.length} more`) : null,
  ];
  const sameFirstYear = !Number(l.price_first_year) || l.price_first_year === l.price_yearly;

  return frame(
    box(
      { justifyContent: "space-between", alignItems: "center" },
      brand(),
      box(
        { background: free > 0 ? C.green : C.booked, color: C.white, fontSize: 28, fontWeight: 700, padding: "10px 26px", borderRadius: 999 },
        free > 0 ? `${free} of ${total} available` : "Fully booked"
      )
    ),
    box(
      { flexDirection: "column" },
      text({ fontSize: title.length > 22 ? 66 : 84, fontWeight: 700, lineHeight: 1.05 }, clip(title, 36)),
      sub ? text({ fontSize: 34, color: C.mint, fontWeight: 400, marginTop: 10 }, clip(sub, 60)) : null,
      box(
        { alignItems: "flex-end", marginTop: 26 },
        text({ fontSize: 110, fontWeight: 700, lineHeight: 1 }, naira(l.price_yearly)),
        text({ fontSize: 38, color: C.mint, fontWeight: 400, marginLeft: 14, marginBottom: 12 }, "/ year"),
        sameFirstYear ? null : text({ fontSize: 30, color: C.mint, fontWeight: 400, marginLeft: 28, marginBottom: 14 }, `${naira(l.price_first_year)} first year`)
      )
    ),
    box({ flexWrap: "wrap" }, ...chips)
  );
}

export default async function handler(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    const lodge = id ? await getLodge(id) : null;
    const count = lodge ? null : (await getHomeData()).count;
    const [bold, regular] = await Promise.all([boldFont, regularFont]);
    const image = new ImageResponse(lodge ? lodgeCard(lodge) : homeCard(count), {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Bricolage", data: bold, weight: 700, style: "normal" },
        { name: "Bricolage", data: regular, weight: 400, style: "normal" },
      ],
    });
    // ImageResponse's default is "cache forever"; override so the live numbers refresh.
    return new Response(image.body, {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch {
    // never leave a broken preview: fall back to the app icon
    return Response.redirect(new URL("/icons/icon-512.png", request.url).toString(), 302);
  }
}
