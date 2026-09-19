# Security

**Audience:** developer, operator

## Contents

- [Threat model](#threat-model)
- [Secrets](#secrets)
- [Secret rotation](#secret-rotation)
- [Personal data](#personal-data)
- [Deleting one participant's data](#deleting-one-participants-data)
- [Known accepted risks](#known-accepted-risks)

## Threat model

| Threat | Mitigation | Where |
|---|---|---|
| Forged payment: the browser claims a payment succeeded | The server recomputes `HMAC-SHA256(order_id|payment_id)` with `RAZORPAY_KEY_SECRET` and compares in constant time. The order ID must match the one stored for the assessment. Reconcile asks Razorpay directly. | `src/lib/razorpay.ts`, `src/app/api/payment/verify/route.ts`, `src/lib/payments/unlock.ts` |
| Webhook spoofing | `HMAC-SHA256(raw body)` with `RAZORPAY_WEBHOOK_SECRET`, compared in constant time after a length check. No secret means every request is rejected. | `src/app/api/payment/webhook/route.ts` |
| Webhook replay | Events are deduplicated by `X-Razorpay-Event-Id`, and unlocking is idempotent. There is no timestamp check, so a replay is accepted but has no effect. | Same file; `src/lib/payments/unlock.ts` |
| Price tampering | The browser never sends an amount. The server creates the order with `ASSESSMENT_PRICE_PAISE` and stores that amount. There is no separate check of the captured amount against the stored amount. | `src/app/api/payment/create-order/route.ts` |
| Unlocking without paying | Questions and submit require the status `QUESTIONS_UNLOCKED`, which only `markPaymentSucceeded` sets. Assessment IDs are random UUIDs. | `src/app/api/assessment/[token]/*` |
| Scoring manipulation | Trait and reverse-key data never leave the server. The server does all scoring. Zod requires exactly 50 answers, each an integer from 1 to 5. A completed assessment cannot be resubmitted. | `src/lib/scoring/engine.ts`, submit route |
| Report link leakage | 32 random bytes per token; only the SHA-256 hash is stored; links expire (default 365 days); admins can revoke; every denial returns the same 404. The report page sets `noindex, nofollow`, the report API sends `Cache-Control: private, no-store`, and `Referrer-Policy: strict-origin-when-cross-origin` keeps the query string out of cross-site referrers. | `src/lib/report-token.ts`, `src/app/report/[id]/page.tsx`, `next.config.ts` |
| Legacy report links | Reports with no token hash open with the report ID alone unless `ALLOW_LEGACY_REPORT_LINKS=false`. | `src/lib/report-token.ts` |
| Admin brute force | bcrypt password hash; login limited per IP and per email (see [API.md](API.md#rate-limits)). | `src/app/api/admin/login/route.ts`, `src/lib/rate-limit.ts` |
| Rate-limit bypass by spoofing IPs | The limiter uses the right-most `X-Forwarded-For` entry, which is added by the hosting proxy, not the client. | `src/lib/client-ip.ts` |
| Admin session theft | Cookie is `HttpOnly`, `SameSite=Strict`, `Secure` in production, HMAC-signed, and expires after 24 hours on the server side even if the browser keeps it. | `src/lib/auth.ts` |
| Unauthenticated admin access | `src/proxy.ts` guards `/admin/*` and `/api/admin/*`; most handlers check again. | See [ARCHITECTURE.md](ARCHITECTURE.md#request-lifecycle) |
| Email enumeration through the resume page | Always the same 200 response, including for unknown emails, invalid input and rate limiting. Limited per IP and per email (see [API.md](API.md#rate-limits)). | `src/app/api/assessment/resume/route.ts` |
| HTML injection in emails | **Not mitigated.** The participant's name is inserted into the email HTML without escaping. Registration only limits its length. | `src/lib/email/templates.ts` |
| XSS in the web app | React escapes all rendered values, including admin views of participant names and audit details. | All pages |
| Data exposure through the PDF | Requires the report token or an admin session; every denial returns 404. | `src/app/api/report/[id]/pdf/route.ts` |
| Data exposure through the CSV export | Requires an admin session (checked by the proxy only). Values are not escaped against spreadsheet formula injection. | `src/app/api/admin/evidence/export/route.ts` |
| Clickjacking and MIME sniffing | `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff` on every response. | `next.config.ts` |
| Accidental data wipe | Reset needs an admin session, `ALLOW_DATA_RESET=true` and the typed phrase `DELETE ALL TEST DATA`. | `src/app/api/admin/reset/route.ts` |

## Secrets

All secrets are environment variables. None are committed; `.env*` files are ignored except `.env.example`. The full list, with what happens when each is missing, is in [CONFIGURATION.md](CONFIGURATION.md).

| Secret | What it protects |
|---|---|
| `ADMIN_SESSION_SECRET` | Signing of admin session cookies |
| `ADMIN_PASSWORD_HASH` | The admin password |
| `RAZORPAY_KEY_SECRET` | Razorpay API access and client-verify signatures |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signatures |
| `RESEND_API_KEY` | Sending email from your domain |
| `DATABASE_URL`, `DIRECT_URL` | The database, including all personal data |

Report link tokens are not configured secrets. Each is generated per report and only its hash is stored.

## Secret rotation

For every rotation: generate the new value (commands in [CONFIGURATION.md](CONFIGURATION.md#generating-secrets)), update it in Vercel for every environment that uses it, then redeploy. Variables are read at startup, so the old value stays in use until the redeploy finishes.

| Secret | Extra steps | What breaks |
|---|---|---|
| `ADMIN_SESSION_SECRET` | None | Every admin session ends. The admin signs in again. |
| `ADMIN_PASSWORD_HASH` | Hash the new password | The old password stops working. Existing sessions stay valid for up to 24 hours; rotate `ADMIN_SESSION_SECRET` too to end them now. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Regenerate the key in the Razorpay dashboard; update both variables and `NEXT_PUBLIC_RAZORPAY_KEY_ID` | A checkout opened before the redeploy fails client verify and is marked `FAILED`. The webhook or reconcile still moves it to `SUCCESS`. Rotate at a quiet time. |
| `RAZORPAY_WEBHOOK_SECRET` | Change it in the Razorpay webhook settings at the same time | Deliveries between the two changes get 400. Resend them from the Razorpay webhook log, or let participants recover through the resume page. |
| `RESEND_API_KEY` | Create the new key before revoking the old one | Emails sent during the switch can fail after 3 attempts; see [RUNBOOK.md](RUNBOOK.md). |
| Database password | Rotate in the provider; update `DATABASE_URL` and `DIRECT_URL` | The site returns 500 until the redeploy completes. |

To cut off one report link, revoke it or issue a new token from the admin console. See [ADMIN_GUIDE.md](ADMIN_GUIDE.md#report-access-panel).

## Personal data

| Data | Stored in | Removed by |
|---|---|---|
| Name, email, phone | `Participant` | Orphan cleanup (unpaid only), reset, manual deletion |
| Name | `Report.content` (name and summary sentence), cached PDF bytes in `ReportPdf` | Same |
| Answers to 50 statements | `Response` | Same |
| Trait scores and report text | `Result`, `Report.content` | Same |
| Razorpay order and payment IDs, amount | `Payment` | Reset or manual deletion. Orphan cleanup removes only `FAILED` payments. |
| Email address | `EmailLog.recipient` | Never by the app; manual deletion only |
| Email address, IP address | `RateLimitHit.key` (`resume:email:`, `login:email:`, `*:ip:`) | Rows older than 24 hours are purged opportunistically |
| Admin IP address | `AuditLog.details` for `ADMIN_LOGIN` | Never by the app |
| Email address | Server logs (`[email] Sent successfully to <EMAIL>` and similar) | Hosting provider's log retention |
| Card, UPI and bank details | Not stored. Razorpay handles them. | Not applicable |
| Contact form messages | Not stored. They go to Formspree. | Formspree account |

There is no automatic retention limit. Data stays until an admin deletes it.

## Deleting one participant's data

There is no admin button for this. Run SQL against the database (for example with `psql "<DIRECT_URL>"`). The same email can have several participant rows; this deletes all of them. Foreign keys are `RESTRICT`, so the order matters.

1. Check what will be deleted:

   ```sql
   SELECT p.id, p.name, p."createdAt", a.id AS assessment_id, a.status
   FROM "Participant" p
   LEFT JOIN "Assessment" a ON a."participantId" = p.id
   WHERE p.email = '<EMAIL>';
   ```

2. Decide whether to keep the payment rows. Razorpay keeps its own record of every payment. If you must keep your own for accounting, skip the `Payment` statement; the `Assessment` and `Participant` statements then fail, so instead replace the participant's name, email and phone with placeholder values.

3. Delete everything in one transaction:

   ```sql
   BEGIN;

   CREATE TEMP TABLE target_assessments AS
     SELECT a.id FROM "Assessment" a
     JOIN "Participant" p ON p.id = a."participantId"
     WHERE p.email = '<EMAIL>';

   DELETE FROM "ReportPdf" WHERE "reportId" IN
     (SELECT id FROM "Report" WHERE "assessmentId" IN (SELECT id FROM target_assessments));
   DELETE FROM "Report"   WHERE "assessmentId" IN (SELECT id FROM target_assessments);
   DELETE FROM "Result"   WHERE "assessmentId" IN (SELECT id FROM target_assessments);
   DELETE FROM "Response" WHERE "assessmentId" IN (SELECT id FROM target_assessments);
   DELETE FROM "Payment"  WHERE "assessmentId" IN (SELECT id FROM target_assessments);
   DELETE FROM "Assessment" WHERE id IN (SELECT id FROM target_assessments);
   DELETE FROM "Participant" WHERE email = '<EMAIL>';
   DELETE FROM "EmailLog" WHERE recipient = '<EMAIL>';
   DELETE FROM "RateLimitHit" WHERE key IN ('resume:email:<EMAIL>', 'login:email:<EMAIL>');

   COMMIT;
   ```

4. Run the query from step 1 again. It should return no rows.

The deletion is not recorded in the audit log. Keep your own record of the request.

## Known accepted risks

| Risk | Impact | Notes |
|---|---|---|
| Participant name not escaped in email HTML | A registrant can put links or markup into the email they receive | Only affects the registrant's own email |
| CSV export not escaped against formula injection | A name starting with `=`, `+`, `-` or `@` can run as a formula when the CSV is opened in a spreadsheet | Open the export as plain text or disable formula evaluation |
| Legacy report links | Reports created before tokens existed open with the report ID alone | Close by setting `ALLOW_LEGACY_REPORT_LINKS=false` once they are reissued; see [DEPLOYMENT.md](DEPLOYMENT.md#legacy-report-link-migration) |
| Report token in the URL | The link can end up in browser history, screenshots or forwarded emails | Mitigated by expiry and revocation |
| No per-session revocation | Logging out clears the cookie only in that browser; a copied cookie stays valid for up to 24 hours | Rotate `ADMIN_SESSION_SECRET` to end all sessions |
| One shared admin account | The audit log cannot say which person acted | By design |
| No captured-amount check | Relies on Razorpay binding the payment to the server-created order | |
| Resume timing | A request for a known email does more work and may take longer than one for an unknown email | Rate limits slow enumeration |
| Proxy assumptions in client IP detection | Correct behind one trusted proxy such as Vercel. Behind an extra CDN, the right-most entry is the CDN's address and all participants share one limit. | Review `src/lib/client-ip.ts` if the hosting changes |
| Unaudited admin actions | Reset, reconcile and CSV export write no audit log row. Reset writes only to the server log. | |
