# Vercel deployment verification — 4 November 2026

Website: https://ecommerce-cat-ten.vercel.app/

- Linked to the existing `messie-tech/ecommerce-cat` Vercel project.
- Applied all seven prepared Production variables, passing values privately through stdin. Server secrets were stored as Secret variables; public framework variables as Config.
- Rebuilt the existing Production deployment and verified its Ready state and public alias.
- Homepage returned HTTP 200 with live Supabase Storage product images.
- `/auth/callback` redirected to the hosted origin, rather than localhost.
- Checkout accepted its hosted origin and required authentication (HTTP 401 for a guest); unrelated origins remain blocked.
- Hosted webhook accepted a correctly signed request using its separate endpoint secret.
- Created and immediately expired a temporary Stripe sandbox Checkout Session. Its real `checkout.session.expired` event was acknowledged with zero pending webhook deliveries. No payment was taken.
- Local application settings and local webhook secret remain separate from the private hosted environment file.

Remaining manual platform step: add the hosted Site URL and callback allowlist in Supabase, then perform the owner's hosted signup/confirmation and checkout test. Vercel variable changes do not modify Supabase Auth URL Configuration. No secret values are included in this report.
