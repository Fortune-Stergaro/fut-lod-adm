import { siteOrigin } from "./_lib/seo.js";

export const config = { runtime: "edge" };

export default function handler(request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const site = siteOrigin(`${request.headers.get("x-forwarded-proto") || "https"}://${host}`);
  const body = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /agent", "Disallow: /connect/", "Disallow: /my-bookings", "", `Sitemap: ${site}/sitemap.xml`, ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" } });
}
