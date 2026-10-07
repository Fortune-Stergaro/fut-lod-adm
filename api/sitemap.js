import { getLodgeIds } from "./_lib/data.js";
import { siteOrigin } from "./_lib/seo.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const site = siteOrigin(`${request.headers.get("x-forwarded-proto") || "https"}://${host}`);
  const ids = await getLodgeIds();
  const urls = [`${site}/`, ...ids.map((id) => `${site}/lodge/${id}`)];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
