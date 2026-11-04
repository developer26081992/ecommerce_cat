# Authentication verification — 4 November 2026

- Owner reported profile migration 003 completed successfully in Supabase SQL Editor.
- Live two-user API tests passed automatic profile creation, own-profile reads/updates, cross-user isolation, protected IDs, and denied profile deletion.
- Browser tests passed guest redirection, signup password-mismatch validation, incorrect-password feedback, sign-in, reload persistence, profile rendering, sign-out, and shopping-bag preservation.
- A tampered external post-login destination redirected to the internal account page.
- An administrator-generated signup confirmation token established a valid cookie session. This test sends no email.
- Invalid confirmation codes were rejected. Temporary accounts/profiles were removed after tests.
- Independent desktop/tablet/mobile design review passed. Automated accessibility audits found no confirmed violations on sign-in/sign-up.
- Redirect-helper unit tests and TypeScript checks passed.

Real confirmation email delivery still requires signup using the owner's email after saving the Supabase Site URL and redirect allowlist. No real credentials or test tokens are included in this report.
