// Serves the SPA shell with per-page SEO tags, so link previews (WhatsApp, Facebook, X, Telegram, Google) see real
// content. Routed from vercel.json for "/" and "/lodge/:id". The browser still gets the normal React app.
import { getHomeData, getLodge } from "./_lib/data.js";
import { homeMeta, lodgeMeta, renderTags, injectSeo, siteOrigin } from "./_lib/seo.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;
  const site = siteOrigin(base);
  const type = url.searchParams.get("type");

  const [shell, lodge, home] = await Promise.all([
    fetch(`${base}/shell.html`),
    type === "lodge" ? getLodge(url.searchParams.get("id")) : null,
    type === "lodge" ? null : getHomeData(),
  ]);
  if (!shell.ok) return new Response("App shell unavailable", { status: 502 });

  let meta;
  if (lodge) meta = lodgeMeta(lodge, site);
  else meta = homeMeta((home ?? (await getHomeData())).count, site);

  const html = injectSeo(await shell.text(), renderTags(meta));
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // refreshed at most once a minute, so the "apartments available" number stays live
      "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
