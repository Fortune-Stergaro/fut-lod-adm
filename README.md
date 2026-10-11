# Futminna Lodges: public site + agent portal (React + Vite)

The visitor-facing site and the agent portal. **There are no admin pages or admin code in this project.**
React 18, Vite, Tailwind CSS v4, Supabase. Hosting: Vercel (the `api/` folder is Vercel functions).

## What's in it
- **Public:** browse lodges (live "apartments available" indicator, filters, stat chips), lodge details (video, prices, features, Previous/Next, Copy link), show interest, book, unbook, contact the lodge's agent once the owner allows it, My bookings, the `/connect/<token>` page for agents.
- **Sign-in:** email + password; new accounts and forgotten passwords use a verification link emailed by Supabase Auth.
- **Agent portal (`/agent`):** registered agents (matched by sign-in email) submit lodges for review, see them as Pending / Approved / Rejected / Booked / Sold, and edit and resend rejected ones.
- **Link previews (SEO):** pasting the home link shows a card with the live number of available apartments; pasting a lodge link shows that lodge's card (price, rooms, availability, features listed premium, then convenient, then essential). Also canonical tags, structured data, `/sitemap.xml`, `/robots.txt`.
- **Installable app (PWA):** web manifest, icons, service worker, "Install app" button.
- **Visit counting:** `src/components/Tracker.jsx` records anonymous visits (random browser id, page, time; no IP/name/email) for the owner's analytics. Remove the file and its `<Tracker />` line in `App.jsx` to turn it off.

## The database is shared with the owner's admin project
The `supabase/` folder is the **whole backend**, including the admin-side tables and functions, because this site and the admin project use the **same Supabase project**. Nothing in the browser code here can use them: they only work for an account whose email is in the `admins` table. Approving lodges, allowing agent connections, marking sold, managing agents and analytics live in the separate full project.
If the database is already set up, do nothing here. For a new Supabase project run, in the SQL Editor and in order: `schema.sql` → `v2-migration.sql` → `v3-migration.sql` → `v4-migration.sql` → `v5-migration.sql` → `v6-migration.sql` → `v7-migration.sql` (deploy the site code first; see `supabase/MIGRATIONS.md`) (**edit your admin email near the top of v5 first**; the script refuses to run until you do).

## Run it
1. `npm install`
2. Copy `.env.example` to `.env`; add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and `SITE_URL` on Vercel, your real domain, no trailing slash)
3. `npm run dev`

## Deploy on Vercel
Framework preset **Vite**, build `npm run build`, output `dist`. Add the same environment variables. `scripts/postbuild.mjs` turns `dist/index.html` into `dist/shell.html` on Vercel so `api/page.js` can add the share-card tags to `/` and `/lodge/:id`.

## Supabase settings
Authentication: Email provider on, "Confirm email" on. URL Configuration: Site URL = your live address; Redirect URLs include `https://yourdomain/**` and `http://localhost:5173/**`. Set up custom SMTP before launch (the built-in sender allows only a few emails an hour).

## Notes
- Contact details shown on every lodge page are the constant in `src/lib/constants.js` (`AGENT`): replace the placeholder phone and WhatsApp numbers.
- Test a share card by pasting a link into WhatsApp, or open `/api/og` and `/api/og?id=<lodge id>` directly.

## Design
The whole site uses a NIHUB-inspired look: deep plum + amber, Bai Jamjuree headings, Poppins body, JetBrains Mono labels. Colour and font tokens live in `src/index.css` (`ink` is now the plum, `paper` a pale lilac, plus `plum`, `amber`, `violet`, fonts `font-display/sans/jet`). Buttons, panels, tags, pop-ups and form fields are styled once in `src/components/ui.jsx`, so every page follows. Browse/Lodge pieces are in `src/components/lodgeUi.jsx`; the footer is `src/components/Footer.jsx`.
