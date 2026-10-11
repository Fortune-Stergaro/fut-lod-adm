# Futminna Lodges (complete project: public site + admin + agent portal)

React + Vite + Tailwind CSS v4 + Supabase. Styling lives in each component as Tailwind classes; `src/index.css` only holds theme tokens and base styles.
Shared building blocks (buttons, panels, tags, modal, chip colours) are in `src/components/ui.jsx`.

## 1. Database (Supabase SQL Editor, in order)
`schema.sql` → `v2-migration.sql` → `v3-migration.sql` → `v4-migration.sql` → `v5-migration.sql` → `v6-migration.sql` → `v7-migration.sql` (deploy the site code first; see `supabase/MIGRATIONS.md`)

**Before running `v5-migration.sql`, open it and replace `PUT-YOUR-ADMIN-EMAIL-HERE` (near the top) with the email you sign in with as admin.** The script refuses to run until you do, so you can't lock yourself out by accident.

## 2. Run it
1. `npm install`
2. Copy `.env.example` to `.env` and add your Supabase URL and anon key
3. `npm run dev`

## 3. Sign-in (Supabase dashboard > Authentication)
- Email provider on; "Confirm email" on.
- New accounts get a **verification link** by email (sent by Supabase Auth). Leave the "Confirm signup" and "Magic Link" templates on their default link versions.
- URL Configuration: Site URL = your live site; add `http://localhost:5173/**` and your live domain `/**` to Redirect URLs. The link brings people back to the page they were on, where they choose a password.
- Authentication > SMTP Settings: set up custom SMTP before launch (the built-in sender allows only a few emails an hour).

## 4. Agents
1. Admin > Agents: add the agent **with their email**.
2. The agent signs in with that exact email. An "Agent portal" link then appears in the header for them only.
3. Agents add lodges at `/agent/new`. They wait under Admin > Lodge requests until you review, edit (add your fee), then approve or reject.
4. Rejected lodges show your note to the agent, who can edit and resend.

## 5. Link previews, SEO and installable app
**Share cards.** Paste the site link in WhatsApp / Telegram / Facebook / X and a card appears:
- `/`: card with the **live number of apartments available** (sum of `units_available` over approved lodges) and a "Tap to browse" call to action.
- `/lodge/<id>`: card for that lodge: name, apartment type, area, yearly (and first-year) price, rooms, availability and its key features.

How it works (Vercel): chat apps don't run JavaScript, so `vercel.json` sends `/` and `/lodge/:id` to `api/page.js`, which fetches the built app shell (`shell.html`), looks up the live data in Supabase (public `lodges_with_stats` view, anon key) and injects the title, description, Open Graph / Twitter tags and JSON-LD before returning it. The React app then loads as normal. `api/og.js` draws the 1200x630 card image. HTML is cached for 1 minute at the edge, images for 5 minutes. The image URL carries the current numbers (`?v=`), so apps re-fetch it when something changes. WhatsApp itself may keep an old preview for a while; Facebook's Sharing Debugger can force a refresh.
- Set `SITE_URL` (Vercel > Settings > Environment Variables) to your real domain so cards and canonical links never use a `*.vercel.app` address. The existing `VITE_SUPABASE_*` variables are reused by the functions, nothing else to add.
- `/sitemap.xml` (home + every approved lodge) and `/robots.txt` are generated live. Admin, agent, connect and my-bookings pages are marked noindex.
- The build runs `scripts/postbuild.mjs`, which turns `dist/index.html` into `dist/shell.html` on Vercel. Locally `npm run dev` just uses the default tags in `index.html`.

**Installable app (PWA).** `public/manifest.webmanifest`, icons in `public/icons/`, and `public/sw.js` (registered in `src/main.jsx`, production only). Chrome/Edge/Android show an "Install app" button in the header when installable; on iPhone use Share > Add to Home Screen. The service worker keeps the app shell available offline and caches built assets; Supabase data and videos are never cached by it. When you change `sw.js`, bump `VERSION` inside it.

Test a card: deploy, then paste a link in WhatsApp, or use the Facebook Sharing Debugger / opengraph.xyz. You can also open `/api/og` and `/api/og?id=<lodge id>` directly in the browser.

`vercel.json` also keeps direct links like `/connect/...` working after a refresh.

## Before launch
Admin pages are still open. When you protect them, update `admin_check()` in `v2-migration.sql`.

## 6. Admin security (v5)
- **Who is an admin:** only emails listed in the `admins` table. Add another with `insert into admins (email) values ('someone@example.com');` in the SQL Editor (lowercase). Remove with `delete from admins where email = '...';`.
- **Real check:** `admin_check()` is true only for a signed-in user whose confirmed account email is in `admins`. Every admin function, admin table policy and the video upload/delete rules already call it, so the protection is in the database, not just the screens.
- **What a normal user sees:** nothing. The header has no Admin link and `/admin/...` shows "Page not found" for signed-out visitors, normal users and agents. The admin screens are a separate code chunk that is only downloaded after the database confirms the account is an admin. To get in, sign in with an admin email using the normal Sign in button; the Admin link then appears.
- **Also locked down in v5:** interest requests (names and phone numbers) were readable by everyone; the public lodge view and lodges table exposed the agents' base prices (your markup). Both are now private. Admin-only functions are no longer callable by signed-out visitors.
- Keep "Confirm email" on in Supabase Authentication so nobody can sign up with an admin email they don't own.

## 7. Analytics (admin > Analytics)
- **Apartments:** available, with interest (people, and how many lodges they are spread over), booked, sold.
- **Money:** made through the site = first-year price of every apartment you mark **sold**. Your profit = first-year price minus the agent's base price, i.e. what you added. Both are stored at the moment you mark an apartment sold, so editing a price later never changes past figures. Lodges you add yourself (no agent base price recorded) count as ₦0 profit.
- **Traffic:** online in the last 30 minutes, visitors today, visitors per day (7/30/90 days, bar chart plus a day-by-day table), total visitors and page views, sign-ups. Counting starts when v5 is installed; earlier traffic can't be recovered. Visitors are anonymous (a random id in the browser, the page path and time; no IP, name or email). Admin pages and any browser that has been signed in as admin are not counted.
- **Agents:** every agent with lodges uploaded, and how many of those have a booking, have interest, or have a sale (icons + colours). Each row opens that agent's detail page.

## 8. Other
- The browse page shows how many apartments and lodges are available right now.
- Each lodge page has a **Copy link** button (copies `https://yourdomain/lodge/<id>`).
- Shared lodge links list the features premium first, then convenient, then essential, in the preview text and on the card image.

## Design
The whole site uses a NIHUB-inspired look: deep plum + amber, Bai Jamjuree headings, Poppins body, JetBrains Mono labels. Colour and font tokens live in `src/index.css` (`ink` is now the plum, `paper` a pale lilac, plus `plum`, `amber`, `violet`, fonts `font-display/sans/jet`). Buttons, panels, tags, pop-ups and form fields are styled once in `src/components/ui.jsx`, so every page follows. Browse/Lodge pieces are in `src/components/lodgeUi.jsx`; the footer is `src/components/Footer.jsx`.

## If the Admin link does not show
See `supabase/check-admin.sql` (admin doctor). Also confirm `VITE_SUPABASE_URL` points to the same Supabase project where you ran v5 and added your email to `admins`. The browser console shows `build: full` for this package, and `[admin_check] failed` with the reason if the check errors.
