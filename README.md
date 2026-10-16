# Toppers Books

Existing hosting: **Cloudflare Pages**, connected to `T4r0n-1/Toppers-Book`.
Public URL: https://toppers-book.pages.dev/

## Current release

The complete CBSE Class 10 Mathematics Standard book is **coming soon**.
The storefront, product details, planned contents, illustrative reader, FAQs,
support links and policy pages work without external account configuration.
No payment is collected, no paid manuscript is public, and sign-in is disabled
until Firebase configuration exists. The reader examples are original examples,
explicitly not verified PYQs or final manuscript pages.

Business: GUPTA ENTERPRISES. Brand: Toppers Books.
Address: Tajganj, Agra, Uttar Pradesh 282001, India.
Support: codetoppers@gmail.com / +91 8384871987 (also WhatsApp).
Planned complete-book price: INR 199; TOPPERS50 subtracts INR 50.
Access: 365 days from captured payment; no renewal, download, print or offline access.

## Pages deployment

Keep the existing Pages Git integration. Framework: none. Build command: blank
(or `node scripts/build.mjs` for the curated static output). Build output:
repository root for the existing configuration, or `dist` after the build script.
The root `functions/` folder is Cloudflare Pages Functions source and must stay
at the project root. No npm dependencies are needed for runtime.

`_routes.json` limits Functions to `/api/*`. `_headers` adds browser protections.
Prefer the curated `dist` output before production sales so only web assets and
policy pages are public. Never put PDFs or private page images in this repository.

## Login configuration (next account step)

1. Create a Firebase project owned by the business. Register a Web app.
2. Enable Authentication > Google and Email/Password > Email link (passwordless).
3. Add `toppers-book.pages.dev` to authorised domains. Add any custom domain later.
4. In Cloudflare Pages > Settings > Variables and Secrets, add:
   - `FIREBASE_API_KEY` — public Web app API key, not a service-account key.
   - `FIREBASE_PROJECT_ID` — exact Firebase project ID.
   - `FIREBASE_AUTH_DOMAIN` — the Web app authDomain, typically PROJECT.firebaseapp.com.
5. Redeploy. Test Google popup sign-in on phone/desktop and email links on the
   same and a different device. Email is verified by the provider before the API
   accepts it. No custom passwords or fake local accounts are used.

Email sign-in uses a secure link, not a numeric OTP. Provider quotas and any
upgraded plan costs must be checked in that account. Mobile numbers are collected
at checkout but NOT verified by SMS in this release. Add an SMS verification
provider and verified-number checks before describing numbers as verified.

## Private book and purchase storage (next Cloudflare step)

1. Create a D1 database. Bind it to this Pages project as `DB`.
2. Apply `schema.sql` once through the D1 console or authenticated Wrangler.
3. Create an R2 bucket and bind it as `BOOKS`.
4. Keep public R2 access OFF: no r2.dev URL or public custom domain for this bucket.
5. Render the finished and checked book to portrait A4 PNG pages, maximum 4 MiB
   per page. Upload ONLY to private R2 using this object naming convention:
   `cbse10-maths-standard/pages/0001.png`, `0002.png`, etc.
6. Populate `books.page_count` and `books.chapters_json` with actual page starts,
   for example `[{"title":"Real Numbers","page":1}]`. Do not use illustrative
   pages as the paid book. Keep `is_ready=0` until all chapters are complete and checked.

The API verifies Firebase RS256 token signatures and issuer, audience, time and
verified email claims. R2 reads require a matching, unexpired, non-revoked purchase.
No browser flag, localStorage value, hidden URL or client-provided price grants access.

## Razorpay configuration (after account review)

Keep credentials in Cloudflare encrypted secrets; never commit, email, paste into
HTML, or send through chat:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET` (a separate chosen webhook secret)

Webhook endpoint: `https://toppers-book.pages.dev/api/webhook`.
Subscribe to `payment.captured`, `order.paid`, `refund.processed`. Enable automatic
payment capture in Razorpay. All callback signatures are checked with the stored
server order ID. Payment details are fetched server-side; only a captured payment
matching the stored INR amount/order grants access. Refunds revoke the associated
entitlement on full refund. Callback/webhook retries do not extend access.

`SALES_OPEN` must remain absent/false until launch. Both `SALES_OPEN=true` AND
`books.is_ready=1` AND all bindings and live credentials are required for public
checkout. Test keys alone cannot enable this production checkout. Use a separate,
restricted preview environment for sandbox payment testing; do not unlock paid
books or accept public test payments on the production store.

## Required before opening sales

- Finish and check every chapter; verify all PYQ attributions and final contents.
- Review public Terms, Privacy, Digital Access and Refund policies against actual operations.
- Connect Firebase, D1, private R2, and the activated Razorpay account.
- Perform sandbox end-to-end checks in a restricted environment (the current
  production gate deliberately accepts only live-key configuration).
- Test real login, order creation, cancel/failure/pending/captured payment,
  callback/webhook retries, expiry, account isolation, refunds and restore.
- Review anti-abuse/rate limiting for login and order endpoints in Cloudflare.
- Add mobile OTP if verified mobile identity is required; assess SMS costs first.
- Confirm currency, gateway pricing, applicable tax treatment and checkout total.
- Update all "coming soon" copy/buttons and FAQs together; then mark the full book
  ready and explicitly enable sales. Merely configuring payment keys is insufficient.

## Watermark and protection limits

Purchased pages are returned as SVG images containing the private PNG and repeated
server-generated name/mobile/order watermarks. Responses are private and no-store.
The reader has no PDF download or print feature. This discourages casual sharing;
it does NOT provide DRM or prevent screenshots, screen recording or a determined
user extracting or modifying browser-delivered content. Do not advertise absolute
copy/download protection. Original PDFs are never sent to the browser.

## Checks

`npm run check` checks browser/server JavaScript syntax.
`npm test` covers payment/auth/access validation and closed-launch behaviour.
No external service credentials are required by these checks.

Useful official references:
- https://firebase.google.com/docs/auth/web/email-link-auth
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://developers.cloudflare.com/pages/functions/bindings/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
