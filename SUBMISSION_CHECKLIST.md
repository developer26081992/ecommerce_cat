# Field & Form submission checklist

Checked against the supplied IQA May/June 2023 Paper 2 brief on 4 November 2026.

Website: https://ecommerce-cat-ten.vercel.app/

Public repository: https://github.com/developer26081992/ecommerce_cat

## Implemented and verified

- Supabase profiles, categories, products, and orders; versioned migrations and seed data committed.
- RLS and least-privilege grants; public catalogue reads, private profiles/orders, verified authenticated checkout, and payment-controlled server order creation.
- Six product PNGs uploaded to Supabase Storage with public URLs; public downloads verified against local files.
- Home, filtered products, product details, persistent Context/localStorage bag, navigation count, quantity controls, subtotal, and server-side Supabase catalogue loading.
- Email/password authentication, confirmation handlers, private account page, and sign-out.
- Stripe test Checkout, signature-verified webhook processing, atomic stock reservations/finalization, replay protection, paid confirmation, and private order history.
- Local browser tests, database privacy/concurrency tests, signature tests, TypeScript, and production builds passed.
- Public Vercel site returned HTTP 200 with live catalogue images. Hosted origin and separate webhook signing secret verified; a real Stripe expiry event was acknowledged.
- GitHub repository accessible without credentials and reported `private: false`.
- README includes stack, setup, environment-variable guidance, repository URL, live URL, AI-use disclosure, and handoff contents.

## Finish before submission

1. **Fix Supabase hosted Auth URLs.** A generated-link check still returned `http://127.0.0.1:3000`. In Authentication URL Configuration, set Site URL to `https://ecommerce-cat-ten.vercel.app` and add `https://ecommerce-cat-ten.vercel.app/auth/callback` under Redirect URLs. Retain the local callback for local development. This setting is separate from Vercel's environment variables.
2. **Test the hosted flow.** On the public website, create/confirm an account using your email, sign out/in, filter products, add/change/remove bag items, complete a Stripe test payment, and verify the confirmation, order history, and one-time stock decrement. Earlier real payment tests were local; the hosted deployment has transport/configuration checks but still needs this complete buyer journey.
3. **Confirm the framework-version requirement.** The paper specifies Next.js 13. This project uses Next.js 16.4.4 App Router; obtain assessor acceptance if version matching is strict.
4. **Copy the source ZIP to the flash drive.** Use `submission/field-and-form-source.zip`, extract it on a clean machine, run `npm ci`, and follow README setup. Include `.env.example`, all migrations, seed data, and images. Do not include real `.env` files, credentials, caches, or `node_modules`.
5. **Submit both URLs and keep services available.** Confirm the assessor can open the public repository and website. Do not pause/delete the Supabase project or disable the hosted Stripe test webhook during marking.

The assessor determines the final mark. This checklist records implementation evidence and remaining checks; it is not a guarantee of 100 marks.
