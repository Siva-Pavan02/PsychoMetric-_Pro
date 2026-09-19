# Configuration

**Audience:** developer, operator

This is the single reference for every environment variable the app reads. Other documents link here instead of repeating these values.

## Contents

- [How configuration is loaded](#how-configuration-is-loaded)
- [Variable reference](#variable-reference)
- [Generating secrets](#generating-secrets)
- [Notes and pitfalls](#notes-and-pitfalls)
- [Recommended values per environment](#recommended-values-per-environment)

## How configuration is loaded

There are two mechanisms, and a variable uses one or the other:

| Mechanism | Variables | Behaviour |
|---|---|---|
| Zod schema in `src/lib/config.ts` | `RESEND_API_KEY`, `EMAIL_FROM`, `ASSESSMENT_PRICE_PAISE`, `ASSESSMENT_CURRENCY` | Parsed once at module import. If invalid, logs `Invalid environment variables:` and throws, so every page and route that imports `config.ts` fails. |
| Direct `process.env` reads | All other variables | Read where they are used. Each has its own failure behaviour, listed below. |

When `NODE_ENV=test`, `config.ts` substitutes `RESEND_API_KEY=test-key` and `EMAIL_FROM=test@example.com`, so the test suite runs without them.

Next.js loads `.env.local` and `.env` automatically. `prisma.config.ts` also loads them through `@next/env`, so Prisma CLI commands see the same values.

## Variable reference

"Required" means the app does not work correctly without it. "Browser" means the value is inlined into client JavaScript.

### Database

| Name | Required | Default | Scope | Example | Purpose | When missing or invalid |
|---|---|---|---|---|---|---|
| `DATABASE_URL` | Yes | None | Server | `postgresql://<USER>:<PASSWORD>@<HOST>/<DB>?sslmode=require` | Runtime connection used by the Prisma client (`src/lib/db.ts`) and scripts. May be a pooled URL. | `db.ts` throws `DATABASE_URL environment variable is not set.` on first import. Every database-backed page and route returns 500. |
| `DIRECT_URL` | Only when `DATABASE_URL` is a Neon pooled URL | Falls back to `DATABASE_URL` | Server (Prisma CLI only) | `postgresql://<USER>:<PASSWORD>@<DIRECT_HOST>/<DB>?sslmode=require` | Non-pooled connection used by `prisma migrate`. Read only in `prisma.config.ts`. | If unset and `DATABASE_URL` contains `-pooler`, every Prisma CLI command prints an error and exits with code 1. The running app never reads it. |

### Payments

| Name | Required | Default | Scope | Example | Purpose | When missing or invalid |
|---|---|---|---|---|---|---|
| `RAZORPAY_KEY_ID` | Yes | None | Server | `rzp_test_<KEY_ID>` | Razorpay API key used to create orders and fetch payments (`src/lib/razorpay.ts`). | `razorpay.ts` throws `Missing Razorpay environment variables` at import. Every route that imports it fails with 500: create-order, verify, status, resume and admin reconcile. |
| `RAZORPAY_KEY_SECRET` | Yes | None | Server | `<KEY_SECRET>` | Razorpay API secret. Also the HMAC key for the checkout signature check in `/api/payment/verify`. | Same as above. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | None | Browser | `rzp_test_<KEY_ID>` | Key passed to the Razorpay checkout widget in `src/app/assessment/page.tsx`. Must be the same key as `RAZORPAY_KEY_ID`. | No startup error. The checkout widget opens with no key and cannot take payment. |
| `RAZORPAY_WEBHOOK_SECRET` | Yes, for webhooks | None | Server | `<WEBHOOK_SECRET>` | HMAC key for verifying `X-Razorpay-Signature` on `/api/payment/webhook`. Must match the secret entered in the Razorpay dashboard. Not listed in `.env.example`. | No startup error. The webhook logs `[webhook] RAZORPAY_WEBHOOK_SECRET not set` and answers every event with 400. Payments then confirm only through client verify or reconcile. |

### Admin

| Name | Required | Default | Scope | Example | Purpose | When missing or invalid |
|---|---|---|---|---|---|---|
| `ADMIN_EMAIL` | Yes | None | Server | `<ADMIN_EMAIL>` | The only email address that can sign in to `/admin`. Compared exactly (case-sensitive). | `/api/admin/login` returns 500 `Server configuration error`. |
| `ADMIN_PASSWORD_HASH` | Yes | None | Server | `"$2b$12$<REST_OF_HASH>"` | bcrypt hash of the admin password. | Missing: login returns 500. Not a valid bcrypt hash (for example, `$` signs lost to variable expansion): every login attempt fails. |
| `ADMIN_SESSION_SECRET` | Yes | None | Server | `<64_HEX_CHARS>` | HMAC key that signs the `admin_session` cookie (`src/lib/auth.ts`). Kept separate from the password hash on purpose. | Creating a session throws, so a correct login returns 400. Verifying a session fails closed, so every `/admin` page redirects to login. |

### Email

| Name | Required | Default | Scope | Example | Purpose | When missing or invalid |
|---|---|---|---|---|---|---|
| `RESEND_API_KEY` | Yes | None (`test-key` when `NODE_ENV=test`) | Server | `re_<KEY>` | Resend API key for report emails. Validated by `config.ts` (non-empty string). | `config.ts` throws at import. Every module that imports it fails: the landing page, `/admin/evidence`, the pricing server action, every payment route (through `razorpay.ts`) and every route that sends email. |
| `EMAIL_FROM` | Yes | None (`test@example.com` when `NODE_ENV=test`) | Server | `PsychoMetric Pro <reports@<YOUR_DOMAIN>>` | Sender address. Its domain must be verified in Resend. Validated by `config.ts` (non-empty string). | Missing: same as `RESEND_API_KEY`. Unverified domain: Resend rejects each send, the app retries 3 times, then marks the `EmailLog` row `FAILED`. |

### Reports

| Name | Required | Default | Scope | Example | Purpose | When missing or invalid |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | Yes | `""` | Server in practice | `https://<YOUR_DOMAIN>` | Absolute origin used to build report and recovery links in emails, and the PDF warm-up request after submission. No trailing slash. | Links become relative (`/report/...`), so emailed links do not work and the PDF warm-up fetch fails silently. |
| `REPORT_TOKEN_TTL_DAYS` | No | `365` | Server | `365` | Lifetime of a report link, set on the report when the token is issued at submission or by the admin **Issue Token** action. | Unset: 365 days. Non-numeric: `parseInt` gives `NaN`, the expiry becomes an invalid date, and the report insert fails. |

### Pricing

| Name | Required | Default | Scope | Example | Purpose | When missing or invalid |
|---|---|---|---|---|---|---|
| `ASSESSMENT_PRICE_PAISE` | No | `9900` | Server | `9900` | Price of one assessment in paise. `9900` is ₹99 (9900 paise). Validated as an integer of at least 100. | Unset: 9900. Below 100 or not an integer: `config.ts` throws at import. |
| `ASSESSMENT_CURRENCY` | No | `INR` | Server | `INR` | Currency sent to Razorpay and stored on each payment. Validated as a string of at least 3 characters. | Unset: `INR`. Shorter than 3 characters: `config.ts` throws. A code Razorpay does not accept fails at order creation. |

### Limits and flags

| Name | Required | Default | Scope | Example | Purpose | When missing or invalid |
|---|---|---|---|---|---|---|
| `ALLOW_DATA_RESET` | No | Disabled | Server | `false` | Enables the **Reset Test Data** action. Only the exact string `true` enables it. | Anything but `true`: `DELETE /api/admin/reset` returns 403 and the admin page shows "Reset Disabled". |
| `ALLOW_LEGACY_REPORT_LINKS` | No | Enabled | Server | `true` | Whether reports with no stored token hash (created before report tokens existed) open without a token. Only the exact string `false` disables it. | Anything but `false`: legacy reports stay open to anyone with the report ID. |
| `NODE_ENV` | Set by Next.js | `development` for `next dev`, `production` for `next build` and `next start`, `test` under Jest | Server | `production` | `production` adds the `Secure` flag to the admin cookie and disables the dev-mode Prisma client cache. `development` enables Prisma error logging. `test` enables the `config.ts` substitutions above. | Do not set it by hand. |

Rate-limit windows and counts are constants in code, not environment variables. They are listed in [API.md](API.md#rate-limits).

## Generating secrets

Run these locally and paste the output into your environment. Never commit the results.

| Secret | Command |
|---|---|
| `ADMIN_SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_PASSWORD_HASH` | `node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" "<YOUR_PASSWORD>"` (run inside the project so `bcryptjs` resolves) |
| `RAZORPAY_WEBHOOK_SECRET` | `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`, then enter the same value in the Razorpay webhook form |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Account & Settings → API Keys → Generate Key |
| `RESEND_API_KEY` | Resend Dashboard → API Keys → Create API Key |

## Notes and pitfalls

- **`NEXT_PUBLIC_*` values are baked in at build time.** Next.js inlines them into client JavaScript during `next build`. Changing `NEXT_PUBLIC_RAZORPAY_KEY_ID` in Vercel has no effect until you redeploy. `NEXT_PUBLIC_BASE_URL` is currently read only in server code, but it follows the same rule if it is ever used in a client component.
- **Quote the bcrypt hash.** A hash starts with `$2b$12$`. In `.env.local`, wrap it in double quotes and escape each `$` as `\$`, or `@next/env` expands `$2b` and `$12` as variables:

  ```dotenv
  ADMIN_PASSWORD_HASH="\$2b\$12\$<REST_OF_HASH>"
  ```

  In the Vercel dashboard, paste the raw hash with no quotes and no escapes.
- **`.env.example` is incomplete.** It omits `RAZORPAY_WEBHOOK_SECRET`, `REPORT_TOKEN_TTL_DAYS`, `ALLOW_DATA_RESET` and `ALLOW_LEGACY_REPORT_LINKS`. Add them yourself when you copy it.
- **The flags are asymmetric.** `ALLOW_DATA_RESET` is off unless set to `true`. `ALLOW_LEGACY_REPORT_LINKS` is on unless set to `false`. Set both explicitly in production.
- **Test and live Razorpay keys must match.** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` must all be test keys or all be live keys, and the webhook secret must belong to a webhook in the same mode.

## Recommended values per environment

| Variable | Local development | Staging | Production |
|---|---|---|---|
| `DATABASE_URL` | Local Postgres or a Neon dev branch | Separate staging database | Production database, pooled URL |
| `DIRECT_URL` | Same as `DATABASE_URL` if not pooled | Non-pooled staging URL | Non-pooled production URL |
| Razorpay keys | `rzp_test_...` | `rzp_test_...` | `rzp_live_...` |
| `RAZORPAY_WEBHOOK_SECRET` | Only if you run a tunnel | Test-mode webhook secret | Live-mode webhook secret |
| `RESEND_API_KEY` | Real key, or accept failed sends | Real key | Real key |
| `EMAIL_FROM` | Address on a verified domain | Address on a verified domain | Address on a verified domain |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | `https://<STAGING_DOMAIN>` | `https://<YOUR_DOMAIN>` |
| `ADMIN_SESSION_SECRET` | Any random value | Unique random value | Unique random value, never reused |
| `ASSESSMENT_PRICE_PAISE` | `100` (₹1) makes test payments cheap | `9900` | `9900` |
| `REPORT_TOKEN_TTL_DAYS` | Unset | Unset | Unset, or your retention period |
| `ALLOW_DATA_RESET` | `true` | `true` | **`false`**, except briefly while clearing launch test data |
| `ALLOW_LEGACY_REPORT_LINKS` | Unset | Unset | **`false`** once no pre-token reports remain. See [DEPLOYMENT.md](DEPLOYMENT.md#legacy-report-link-migration). |
