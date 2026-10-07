// After `vite build`, make the built index.html available as dist/shell.html (the app shell api/page.js injects SEO tags into).
// On Vercel, index.html is renamed so "/" and "/lodge/:id" are answered by api/page.js instead of the static file.
// Locally, both files are kept so `npm run preview` still works.
import { copyFileSync, renameSync, existsSync } from "node:fs";

if (!existsSync("dist/index.html")) throw new Error("dist/index.html not found. Did vite build run?");
if (process.env.VERCEL) renameSync("dist/index.html", "dist/shell.html");
else copyFileSync("dist/index.html", "dist/shell.html");
console.log(process.env.VERCEL ? "dist/index.html -> dist/shell.html" : "dist/shell.html created (local build)");
