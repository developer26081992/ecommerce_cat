# Checkout verification — 4 November 2026

- Owner reported migration 004 succeeded in Supabase SQL Editor.
- Saved restricted test key successfully created, retrieved, and expired hosted Checkout Sessions.
- Payload tests reject client prices, duplicate items, invalid IDs, invalid quantities, and live-mode keys/session IDs.
- Signature tests reject modified raw bodies, wrong secrets, and stale timestamps.
- Live database tests passed concurrent last-item reservation limits, request ownership, server pricing, amount mismatch rejection, duplicate finalization, one-time stock decrement, private order reads, denied client order/function writes, and reservation release.
- A real Stripe-hosted ZAR40 sandbox payment with the public 4242 test card completed against an isolated production-build server. No real money moved.
- The return page was blocked during that test. Two concurrent locally signed event replays created one paid order and reduced stock exactly once. An unpaid-session event created no order; a late expiry did not reverse a paid order.
- Paid receipt and order history rendered correctly. Purchased bag quantities were deducted once, additional quantities remained, and reload did not deduct again.
- The actual checkout button redirected to Stripe. Returning to the cancellation URL expired the Session, released its hold, and preserved the bag.
- Temporary Auth users/profiles, fixture products, reservations, and database orders were removed. Stripe test Sessions remain completed or expired as a test audit trail.
- Independent guest-cart and paid-receipt design review passed desktop/tablet/mobile. Build and TypeScript checks passed.

The replay secret existed only in the temporary test server/cache, not `.env.local`. After the owner saved a standard test secret key, real Stripe-to-CLI forwarding was configured. The CLI secret was saved privately in ignored `.env.local`, and a real Stripe `checkout.session.expired` event was forwarded to the local webhook and acknowledged with HTTP 200. Normal checkout is now enabled while the local shop and listener are running. The hosted deployment will need its own webhook endpoint/signing secret.
