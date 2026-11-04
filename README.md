# Field & Form

A responsive homeware shop built with Next.js App Router, TypeScript, React Context, Tailwind CSS, Supabase, and Stripe Checkout.

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
- Email/password sign-up, confirmation, sign-in, sign-out, and a protected `/account` page.
- Cookie-based sessions refreshed in Next.js Proxy, with server-verified account access.
- Private user profiles created automatically when an Auth user is added.
- Authenticated Stripe-hosted test checkout with database prices, inventory reservations, and idempotent request handling.
- Verified payment webhooks that atomically save paid orders and decrement stock once, plus private `/orders` history and paid confirmation pages.
- Safe checkout cancellation and bag reconciliation that preserves unpurchased items and ignores old confirmation links.

Payments currently support Stripe test keys only; live keys and live webhook events are rejected. Adding items to a bag does not reserve stock. Starting checkout reserves availability, and paid fulfillment decrements product stock. Checkout is disabled until a webhook signing secret is configured. Vercel deployment and its production webhook configuration remain outstanding.

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

## Authentication setup

1. Apply `supabase/migrations/003_profiles.sql` once in the SQL Editor, after the catalogue migrations. Existing Auth users are backfilled. The profile trigger runs with a fixed empty search path; anonymous profile access is denied and signed-in users can read/update only their own profile. Only the display-name column is writable by users.
2. Enable the Email provider in Supabase Authentication. Keep email confirmation enabled for real accounts.
3. In Authentication URL Configuration, set Site URL to `http://127.0.0.1:3000` and add `http://127.0.0.1:3000/auth/callback` under Redirect URLs. Use the same hostname when browsing the app.
4. Set `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` in `.env.local`. On Vercel, replace this with the actual HTTPS deployment origin and add its callback URL in Supabase before testing signup.
5. Open `/sign-up`, create an account with your own email address, and follow the confirmation email in the same browser. The default confirmation flow uses PKCE and `/auth/callback`. Mail delivery depends on your Supabase email/SMTP configuration; automated tests do not send signup emails.
6. `/auth/confirm` also supports signup/email token hashes for a custom confirmation template: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. This optional template supports confirmation without a PKCE verifier in that browser.

The administrative secret key is never exposed to the browser. Authentication uses the publishable key and Supabase cookie sessions; trusted checkout/webhook server code uses a separate administrative client for payment-controlled mutations. `/account` verifies the user with Supabase on the server and profile/order reads remain subject to RLS. Sign-out ends the current browser session and preserves the device's shopping bag. Redirect destinations are restricted to implemented internal pages.

Validation: `npm run test:auth` checks redirect handling (requires Node 22.6+ for TypeScript stripping; tested with Node 24). `npm run supabase:verify-profiles` checks the signup trigger, profile isolation between two users, allowed own-name updates, and denied ID/deletion operations, then removes both test accounts and their profiles. Migration 003 and these live profile tests passed on 4 November 2026. Browser tests passed sign-in errors, successful login, reload persistence, sign-out, protected routes, signup token confirmation, invalid confirmation handling, and external-redirect rejection. The owner subsequently confirmed completing actual signup and email confirmation.

## Stripe checkout and orders

1. Apply `supabase/migrations/004_orders_checkout.sql` once after the earlier migrations. The project owner reported this completed successfully on 4 November 2026. Do not rerun `setup.sql` over the existing tables.
2. Set `STRIPE_SECRET_KEY` to a sandbox secret or restricted key (`sk_test_` or `rk_test_`) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to its `pk_test_` key in ignored `.env.local`. The restricted key needs Checkout Sessions read/write access. The currently saved key successfully created, retrieved, and expired test Sessions.
3. Run `npm run stripe:listen` in a second terminal. The bundled Stripe CLI uses the saved test key, forwards checkout events, saves its signing secret privately in `.env.local` if needed, and redacts secrets from output. Keep this terminal running alongside `npm run dev`. The current standard test key supports forwarding; restricted keys require Debugging Tools Write.
4. If you later change the Stripe key/account, restart the listener and then restart the shop if it has not reloaded `.env.local`. For manual CLI authorization, use `npm exec --yes --package @stripe/cli -- stripe login`. A hosted webhook needs its own signing secret rather than the local CLI secret.
5. Sign in, add products, and choose **Continue to test checkout**. Use Stripe's public test card `4242 4242 4242 4242`, a future expiry, and any three-digit CVC. No real money is charged. Cancellation returns to the bag, expires the open Session, and releases its reservation.
6. For Vercel, configure all environment variables and `NEXT_PUBLIC_SITE_URL` for the HTTPS deployment. Register `/api/stripe/webhook` in the same Stripe sandbox with the four events above and use that endpoint's `whsec_` value. Do not use the local CLI secret there.

`POST /api/checkout` requires a verified user and matching Origin. It accepts only product IDs, integer quantities, and a request UUID; prices, totals, user IDs, and item descriptions come from server-side data. Currency is ZAR, with integer minor units used for calculation. The integration uses the current Stripe SDK's `allowed_payment_method_types` card filter. Shipping, discounts, and automatic tax are not added in this assignment checkout.

Inventory reservations, paid order creation, and stock changes use service-only PostgreSQL functions and a short transaction lock. Client roles cannot create or mutate orders/reservations directly. Signed webhooks read the Session back from Stripe, verify paid status/identity/amount/currency, and finalize once per Session. The authenticated confirmation page uses the same idempotent fulfillment path as a fallback. Pending/unavailable payment states never claim success or clear a bag. `/orders` and confirmation status verify the user's ownership.

Reservations are released only after verified Stripe expiry or explicit cancellation, not solely because a local timer elapsed. If event delivery fails, retry the webhook or inspect the Session before releasing a hold. Ambiguous Session-creation network failures keep their reservation and reuse the request's Stripe idempotency key; administrative reconciliation may be needed for an abandoned attempt without a saved Session ID. Do not manually reduce stock below outstanding reservations.

`npm run test:checkout` checks payload validation, test-only keys, and signature tampering/expiry. `npm run supabase:verify-checkout` tests concurrent last-item reservations, request ownership, trusted pricing, amount mismatch, duplicate fulfillment, stock decrement, order privacy, client mutation denial, and release/re-reservation; it removes isolated fixtures afterward. A real ZAR40 sandbox payment also passed against the production build using a temporary test product/account. With the return page blocked, locally signed event replays created one order and decremented stock once; receipts, bag reconciliation, and cancellation UI passed. Those replays test the handler, not live Stripe-to-CLI delivery. Local webhook forwarding was subsequently configured using the saved standard test key. Stripe CLI is forwarding the four checkout events to `/api/stripe/webhook`, and a real Stripe `checkout.session.expired` event received HTTP 200. The real CLI signing secret is stored only in ignored `.env.local`; the earlier isolated replay secret was never written there. Keep the shop and listener running for local tests.

## Notes on the assignment

The supplied paper names Next.js 13. This implementation uses the current Next.js 16 App Router for maintained framework support while retaining the requested routing architecture. Confirm the exact version requirement with your assessor if strict version matching is required.

AI assistance: this project was created with OpenAI Codex (ChatGPT), including application code, illustrative assets, and documentation. Review and understand the code before submitting it as your work.

GitHub repository: https://github.com/developer26081992/ecommerce_cat

Live URL: https://ecommerce-cat-ten.vercel.app/

Vercel Production variables and the separate hosted Stripe webhook are configured. Public catalogue, hosted callback origin, checkout-origin enforcement, and webhook signature checks passed. A real Stripe test expiry event was acknowledged with no pending webhook deliveries. Local forwarding remains configured separately. This application accepts sandbox payments only.

Final hosted authentication setup: in Supabase Authentication URL Configuration, set Site URL to `https://ecommerce-cat-ten.vercel.app` and add `https://ecommerce-cat-ten.vercel.app/auth/callback` under Redirect URLs. Keep `http://127.0.0.1:3000/auth/callback` there for local development. After saving, test signup/confirmation and checkout on the hosted shop. The Vercel environment update does not change these Supabase dashboard settings.

For a local source handoff, include the source files, `package.json`, `package-lock.json`, `.env.example`, `public/`, and `supabase/`. Exclude real environment files, `.next`, caches, and `node_modules`; install dependencies using `npm ci` on the destination device.
