# Supabase verification — 4 November 2026

Project: `vvnrgyivkqdnhcasowhx`

- Owner reported the combined schema/seed SQL completed successfully in Supabase SQL Editor.
- Live reads confirmed the six seeded products and their categories.
- Uploaded six PNG product illustrations to the public `product-images` bucket and updated all six product image URLs.
- All six public downloads matched the local PNGs byte-for-byte.
- Anonymous and authenticated clients can read products and categories.
- Anonymous and authenticated INSERT, UPDATE, DELETE on both catalogue tables returned insufficient privilege (`42501`).
- Anonymous and authenticated Storage uploads and overwrites were denied. Deletion attempts left the isolated admin-created test object intact.
- Temporary confirmed test account and isolated probe rows/objects were removed after verification. No email was sent.

Commands completed successfully:

```text
npm run supabase:upload-images
npm run supabase:verify
npm run supabase:verify-roles
```

These are live API permission checks, not a direct database inspection of policy definitions. `supabase/verify-permissions.sql` is available for separate SQL Editor inspection. Credentials remain in ignored `.env.local` and are not included in this report.
