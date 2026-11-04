# Field & Form

A responsive homeware catalogue and persistent shopping bag built with Next.js App Router, TypeScript, React Context, Tailwind CSS, and Supabase.

## Run locally

Requires Node.js 20.9 or newer and npm. This project was checked with Node 24.

1. Run `npm ci` (if the default npm cache is restricted, use `npm ci --cache .npm-cache`).
2. Run `npm run dev`.
3. Open http://127.0.0.1:3000.

Use `npm run build` and `npm start` for a production build. `npm run typecheck` checks TypeScript.

## What works

- Homepage with featured products and a responsive catalogue.
- Category filters at `/products?category=ceramics` (also textiles and living).
- Product pages at `/products/[slug]`, with availability and add-to-bag controls.
- `/cart` with quantities, removal, stock limits, and subtotals in ZAR.
- A navigation item count and bag persistence using browser localStorage.
- Corrupt stored data is discarded; missing or unavailable products are removed when the bag loads. Current server catalogue prices and stock are used for the bag.
- Loading, error, missing product, sold out, and empty bag states.

The first phase intentionally stops at catalogue and cart. Authentication, orders, payment checkout, Stripe webhooks, stock reservations, and deployment remain to be implemented. The checkout button is visibly disabled. No payment is taken and no order is created. Adding to a bag does not reserve stock.

## Supabase setup (optional)

For a fresh project, `supabase/setup.sql` combines both migrations and the seed in one transaction. Paste that file into the Supabase SQL Editor and run it once instead of running steps 2–3 individually. It creates the catalogue tables and bucket; image uploads still require the local scripts and keys below. Do not run it over existing catalogue tables.

Without credentials, server-rendered pages use the six illustrative sample products in `lib/demo.ts`. The interface identifies these as demonstration products. When both credentials are supplied, queries run on the server using `@supabase/ssr`; database failures surface an error rather than silently reverting to sample data.

1. Create a Supabase project.
2. Apply `supabase/migrations/001_catalogue.sql` in the SQL Editor.
3. Apply `supabase/migrations/002_catalogue_privileges.sql` for explicit grants, then `supabase/seed.sql` to populate the sample categories and products. Run migration 001 only on a fresh schema; inspect an existing project before applying it.
4. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported as an alternative. Never put a service-role key in a public variable.
5. For the local upload/verification scripts, also set `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`). These scripts run outside the web app and never print the key.
6. Run `npm run supabase:upload-images`. This uploads the six bundled PNG illustrations, checks each public download's SHA-256, and updates the matching seeded products' `imageUrl` fields. Content-addressed object names make reruns safe; the script never resets stock or prices. Existing illustrations were rasterized from the original local SVG assets, not sourced as product photography.
7. Run `supabase/verify-permissions.sql` in the SQL Editor. It checks RLS, public read grants, absence of client write grants, and real catalogue reads as both `anon` and `authenticated`. It also lists Storage policies for inspection, including policies that may already exist in a reused project. Its transaction is rolled back.
8. Run `npm run supabase:verify`. It verifies all six public images and anonymous catalogue reads, then checks that anonymous product writes and Storage uploads fail because of permissions. Run `npm run supabase:verify-roles` for both anonymous and authenticated product/category INSERT, UPDATE, DELETE checks, plus Storage upload, overwrite, and deletion checks. The latter creates a temporary auto-confirmed test account without sending email and removes it and all isolated test data afterward. Do not interrupt verification during cleanup.
9. Restart the app to load `.env.local`.

The migrations enable RLS and grant public SELECT only on categories/products. Anonymous and authenticated catalogue writes are denied; the service role has explicit administrative data privileges. The public `product-images` bucket accepts PNG, JPEG, and WebP and has no client upload policy created by this project. Public image downloads are intentional. The bundled SVG illustrations remain available locally for demo mode; six matching PNGs are in `supabase/product-images/` for Storage uploads.

Connection status (4 November 2026): project `vvnrgyivkqdnhcasowhx` is configured locally using ignored `.env.local` credentials. The SQL setup was run successfully in the dashboard by the project owner. All six seeded products were read back, six PNG images uploaded and linked, and each public download verified byte-for-byte. Live API tests passed for anonymous and authenticated catalogue reads, denied writes to products/categories, and denied Storage upload/overwrite/deletion. Temporary test accounts and objects were cleaned up. The SQL-only RLS/grant introspection file remains available for dashboard inspection; the automated live checks exercised access through Supabase's APIs.

SQL uses the case-sensitive `imageUrl`, `categoryId`, and `createdAt` columns from the brief, plus a unique `slug` and `featured` flag needed by the UI. Keep quoted column names when editing SQL.

## Notes on the assignment

The supplied paper names Next.js 13. This implementation uses the current Next.js 16 App Router for maintained framework support while retaining the requested routing architecture. Confirm the exact version requirement with your assessor if strict version matching is required.

AI assistance: this project was created with OpenAI Codex (ChatGPT), including application code, illustrative assets, and documentation. Review and understand the code before submitting it as your work.

GitHub repository: https://github.com/developer26081992/ecommerce_cat

Live URL: not deployed. Authentication, orders, payments, and Vercel deployment remain to be implemented.

For a local source handoff, include the source files, `package.json`, `package-lock.json`, `.env.example`, `public/`, and `supabase/`. Exclude real environment files, `.next`, caches, and `node_modules`; install dependencies using `npm ci` on the destination device.
