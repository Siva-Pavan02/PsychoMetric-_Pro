# Testing

**Audience:** developer

## Contents

- [Checks](#checks)
- [Test suites](#test-suites)
- [Scripts](#scripts)
- [End-to-end API script](#end-to-end-api-script)
- [Manual QA checklist](#manual-qa-checklist)

## Checks

Run all four before every release. None of them needs a database or environment variables, except the build, which needs the variables that `src/lib/config.ts` validates at import.

| Check | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | `Test Suites: 12 passed, 12 total` |
| Type check | `npx tsc --noEmit` | No output, exit code 0 |
| Lint | `npm run lint` | No errors |
| Production build | `npm run build` | Build completes and lists every route |

Run one suite with `npx jest src/__tests__/<FILE>.test.ts`.

Jest runs files matching `**/__tests__/**/*.test.ts` (see `jest.config.ts`). Jest does not load `.env` files; suites that need settings either mock them or rely on the `NODE_ENV=test` defaults in `config.ts`.

## Test suites

| Suite | Covers | Tests the real code? |
|---|---|---|
| `src/__tests__/scoring-engine.test.ts` | Question set shape (50 items, 10 per trait), the all-3s midpoint, all-1s and all-5s extremes, reverse-score complement, boundaries, score range and 2.5 granularity, rejection of invalid, missing and duplicate answers, determinism, order independence | Yes |
| `src/__tests__/response-quality.test.ts` | Quality flags and that `valid` is false exactly when a flag is raised | Yes |
| `src/__tests__/report-token.test.ts` | Token generation and hashing; `checkReportAccess` for a valid token, a missing or wrong token, expiry, revocation, and legacy reports allowed by default | Yes |
| `src/__tests__/razorpay.test.ts` | Checkout signature verification: valid; wrong, truncated, empty, oversized and non-hex signatures; wrong order or payment ID | Yes (sets its own test keys) |
| `src/__tests__/email.test.ts` | Test-mode `config.ts` values and the report email HTML | Yes |
| `src/__tests__/pdf-cache.test.ts` | PDF route serving a cached PDF; regen-pdf; clear-pdf. Database, auth and renderer are mocked. | Yes, with mocks |
| `src/__tests__/orphan-cleanup.test.ts` | Cleanup preview count and deletion of matched orphans, with the database mocked | Yes, with mocks |
| `src/__tests__/admin-metrics.test.ts` | Paise to rupee conversion and formatting, revenue rules | Yes (`currency.ts` only) |
| `src/__tests__/site-footer.test.ts` | Contact form validation | Yes |
| `src/lib/utils/__tests__/date.test.ts` | IST formatting, midnight boundaries, independence from the machine's time zone | Yes |
| `src/__tests__/payment-unlock.test.ts` | Webhook signature, unlock idempotency, no downgrade of `SUCCESS`, reconcile ignoring non-captured payments, webhook event deduplication | **No.** It tests copies of the logic written inside the test file. |
| `src/__tests__/rate-limit.test.ts` | Limit, key separation, retry-after, window expiry, client IP | **No.** Copies inside the test file. Its client IP copy uses the left-most `X-Forwarded-For` entry, which no longer matches `src/lib/client-ip.ts`. |

`src/lib/scoring/analytics.test.ts` exists but is **not run**: it is not inside a `__tests__` folder, so `testMatch` skips it. Run it explicitly with `npx jest --testMatch "**/analytics.test.ts"`.

Areas with no automated tests: the payment routes (`create-order`, `verify`, `status`, `webhook`), submit, resume, admin login and the proxy, the report access actions, reset, and all pages.

## Scripts

Files in `scripts/` are run by hand. They are not in `package.json`.

| Script | Command | Purpose | Writes data |
|---|---|---|---|
| `db-check.mjs` | `node --env-file=.env.local scripts/db-check.mjs` | Connects, runs `SELECT 1`, lists tables | No |
| `check-reports.mjs` | `node --env-file=.env.local scripts/check-reports.mjs` | Prints the ID, assessment ID and date of two reports | No |
| `find-legacy-report.ts` | `npx tsx --env-file=.env.local scripts/find-legacy-report.ts` | Prints the first report in the old content format (no `methodology`) | No |
| `test-report-engine.ts` | `npx tsx scripts/test-report-engine.ts` | Prints the report text produced for 5 fixed score profiles | No |
| `e2e-api.mjs` | See below | Runs the participant API flow against a local server | **Yes** |

`tsx` is not a project dependency; `npx` downloads it on first use.

## End-to-end API script

`scripts/e2e-api.mjs` calls the API at `http://localhost:3000` (fixed in the script) and performs:

1. Start an assessment for "E2E Test User", `test@example.com`
2. Create a Razorpay order
3. Verify a payment, using a signature it computes with `RAZORPAY_KEY_SECRET`
4. Fetch the questions and submit random answers
5. Submit again and expect `alreadySubmitted`
6. Fetch the report JSON
7. Fetch the PDF

**Current state:** steps 6 and 7 request the report without the `?t=` token, so they fail with 404 for every report created by the current code. Steps 1 to 5 are still a useful check of the payment and submission path.

Run it safely:

1. Point `.env.local` at a **development** database and **test** Razorpay keys. The script creates real rows and a real test-mode Razorpay order.
2. Start the app: `npm run dev`.
3. In a second terminal:

   ```bash
   node --env-file=.env.local scripts/e2e-api.mjs
   ```

4. Remove the rows afterwards with orphan cleanup (after 7 days), the reset, or the SQL in [SECURITY.md](SECURITY.md#deleting-one-participants-data) with `test@example.com`.

Repeated runs reach the limit of 10 per hour on start and create-order. Clear it with `DELETE FROM "RateLimitHit" WHERE key LIKE 'start:%' OR key LIKE 'create-order:%';` on the development database.

## Manual QA checklist

Use Razorpay test mode on a staging deployment with a webhook configured. How each path should behave is in [PAYMENTS.md](PAYMENTS.md).

### Payments

- [ ] Normal payment unlocks the questions; `confirmedVia` is `client_verify` or `webhook`
- [ ] Closing the tab straight after paying still unlocks (webhook)
- [ ] With the webhook disabled, `/assessment/resume` unlocks a closed-tab payment and emails the questions link
- [ ] A failed test payment can be retried and succeeds
- [ ] Cancelling Checkout shows "Payment was cancelled"
- [ ] Resending a webhook from the Razorpay log changes nothing
- [ ] Price on `/`, on `/assessment` and in Checkout matches `ASSESSMENT_PRICE_PAISE`

### Assessment and report

- [ ] Questions page refuses an unpaid assessment ("Access denied")
- [ ] All 50 questions, review screen, submit
- [ ] Report opens with its `?t=` link; **Download PDF** works from that page
- [ ] The same report without `?t=`, or with a wrong token, shows not found
- [ ] Report email arrives and its link works
- [ ] PDF shows the quality box for straight-lined answers (all 3s)

### Admin

- [ ] Wrong password is refused; 11 attempts from one IP in 15 minutes get 429
- [ ] Every sidebar page loads
- [ ] **Resend Email**: new email arrives; the old link now shows not found
- [ ] **Revoke Access**: link and PDF show not found; **Issue Token** restores access with the new token
- [ ] **Extend 30 Days** moves the expiry date
- [ ] **Regen PDF** and **Clear PDF Cache** succeed; "PDF Cached" changes accordingly
- [ ] **Export CSV** downloads and opens
- [ ] **Cleanup Orphans** asks for confirmation and reports a count
- [ ] Reset shows "Reset Disabled" when `ALLOW_DATA_RESET` is not `true`
- [ ] Audit Log lists the actions above
