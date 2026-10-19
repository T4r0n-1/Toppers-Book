# Toppers Books

Existing hosting: **Cloudflare Pages**, connected to `T4r0n-1/Toppers-Book`.
Public URL: https://toppers-book.pages.dev/

## Current release

The complete CBSE Class 10 Mathematics Standard book is **coming soon**.
The storefront, product details, planned contents, illustrative reader, FAQs,
support links and policy pages work without external account configuration.
No payment is collected and no paid manuscript is public. Google and email/password
sign-in are connected to the owner's `toppers-books` Firebase project. The reader examples are original examples,
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

## Login configuration

The owner supplied their Firebase Web app configuration, stored in
`assets/firebase-config.js`. These are public identifiers, not admin credentials.
The Pages API and the Firebase browser SDK use the same configuration. No Cloudflare
environment variables are required just to enable this configured login.

1. Firebase project: `toppers-books`; Web app: Toppers Books Website.
2. Enable Authentication > Google and Email/Password. Keep Email link and Phone OFF.
3. Add `toppers-book.pages.dev` to authorised domains. Add any custom domain later.
4. Test Google popup sign-in and email signup/login on phone/desktop. New email
   accounts receive a verification email. Until email verification completes,
   purchases and private reading are denied. The user can reload verification state,
   resend verification after a cooldown, sign out, or request a password reset.
5. Normal password login does not send a sign-in email. Passwords are handled by
   Firebase; the store does not log or persist them. Keep email enumeration protection ON.

For a separate environment, all three `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`,
`FIREBASE_AUTH_DOMAIN` can override the public config. Set `AUTH_DISABLED=true` to
temporarily disable sign-in and checkout. Never add a service-account private key.
While the store is closed and D1 is not bound, a verified account sees an empty shelf.

## Customer profiles

Email registration collects full name, Indian mobile number, email and password.
Registration requires the D1 profile binding to be configured so the form never
claims to have saved data with nowhere to store it. Existing Google/email sign-in
continues to work while profile storage is being connected.

After Google sign-in, the customer completes any missing name/mobile details.
My Books includes a My profile form for later edits. The private D1
`customer_profiles` table is keyed by the cryptographically verified Firebase UID.
Email is taken from the token; form-supplied UID/email cannot select another user.
Signed-in, unverified email users may save only their own profile, but still cannot
purchase or read until email verification completes. Phone numbers are explicitly
not SMS-verified. No contact details are saved in localStorage.

New D1 database: apply the full `schema.sql`. Existing D1 database: apply
`migrations/0001-customer-profiles.sql`. Bind the database as `DB` in the Pages
project's production settings, then redeploy. Confirm `/api/config` reports
`profileEnabled:true`, test a signup and Google profile, and check saving persists
after signing out and back in. The D1 binding is not yet connected by this commit.

Checkout uses the saved server profile as the watermark identity. The buyer sees
these details and may edit the profile before payment. Each order snapshots them;
later profile edits do not rewrite previously purchased copies.

Email-link login was replaced because Spark permits only 5 sign-in link emails/day.
Verification/reset mail also has quotas; check current Firebase limits and any
upgraded plan costs in the account. Mobile numbers are collected
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
- Verify the connected Firebase login end to end, and bind D1, private R2, and the activated Razorpay account.
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
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/manage-users
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://developers.cloudflare.com/pages/functions/bindings/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/


## Reader corrections and publication information

The reader and book details link to `/corrections.html`. The reader passes its
current page and marks illustrative demo reports separately from book reports.
The form prepares a mailto draft addressed to codetoppers@gmail.com; readers must
send it themselves. A selectable/copyable draft is available if no email app opens.
No report is saved or sent by the website.

The page has a public, manually curated corrections list. Keep publication metadata
and release status up to date when the complete book is published. Use the assigned
digital ISBN only, and log checked corrections with an actual update date and
page/question reference. Do not publish customer details or unreviewed suggestions.


## Supplied 223-page edition (19 October 2026)

The owner supplied the complete PDF and DOCX. The public assets contain ONLY
the cover and five selected PDF pages: 5, 14, 15, 69, 180. These replace the old
illustrative reader demo. Source labels and manuscript claims have not been
independently audited by this deployment. No original PDF, Word file, full-page
set or upload ZIP belongs in the public repository.

`assets/book-data.js` holds the public edition/sample metadata. Full paid chapter
starts are in the private upload package's manifest and registration SQL. The
package is prepared using `scripts/prepare-book.py` and must be extracted before
uploading the `cbse10-maths-standard` directory to private R2. Register the actual
223 pages only after upload. Keep `is_ready=0` and SALES_OPEN false until tests pass.

Private upload and paid-reading end-to-end verification still require the owner's
Cloudflare account; a successful Pages deployment does not upload private R2
objects or run D1 SQL. The watermark footer is outside the original image area
so it does not cover the author/footer text on the supplied pages.


## Reader controls and local rough work

The reader uses a bounded viewport grid on mobile and desktop. At Fit page zoom,
horizontal pointer swipes turn pages; zooming enables panning instead. Reduced
motion preferences disable the turn effect. The reader toolbar has one correction
link; the public corrections page continues to include update information.

Left and right rough-work panels support pen/eraser strokes, undo and typed notes.
Their localStorage drafts are keyed by user, book and side; they are not sent to
D1 or R2 and do not sync across devices. A storage failure is shown in the pad.
Clearing browser data removes drafts. These tools never edit book content.
Credential failures show the same invalid-email/password message for missing
accounts and wrong passwords, both in the summary and next to the password field.


## Free Maths practice

`/practice.html` is a public Class 10 concept-practice area, separate from paid
reading entitlements. The initial original bank has 28 questions (two per chapter),
with mixed (14), full (28) and chapter (2) sessions. They are not labelled as PYQs.
The browser computes marks, attempted accuracy and a per-chapter sample snapshot;
no AI or diagnostic mastery claim is involved. Worked explanations are reviewed
with the question bank. Tests cover grading and selection invariants.

A timed session uses an absolute deadline and submits when it expires, including
after resuming. One draft/result is kept in localStorage when available; it is not
saved to the customer account or synced. This client-side practice bank is not a
secure examination service. Notebook-photo analysis is not connected in this
release: it needs a separately configured AI backend and private image handling.
