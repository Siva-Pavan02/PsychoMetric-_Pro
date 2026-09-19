# Runbook

**Audience:** operator, admin

Symptoms, causes and fixes. Steps marked **Operator** need database or Vercel access. SQL runs against the production database, for example with `psql "<DIRECT_URL>"`. Take a backup before any `UPDATE` or `DELETE` (see [DATABASE.md](DATABASE.md#backup-and-restore)).

## Contents

- [Logs](#logs)
- [Useful queries](#useful-queries)
- [Quick reference](#quick-reference)
- [Participant paid but cannot see the questions](#participant-paid-but-cannot-see-the-questions)
- [Submission fails](#submission-fails)
- [Webhook failing](#webhook-failing)
- [Emails not arriving](#emails-not-arriving)
- [PDF slow or failing](#pdf-slow-or-failing)
- [Report link returns 404](#report-link-returns-404)
- [Admin login returns 429, 500 or keeps failing](#admin-login-returns-429-500-or-keeps-failing)
- [Rate limits blocking real participants](#rate-limits-blocking-real-participants)
- [Database will not connect](#database-will-not-connect)
- [Migration failed](#migration-failed)
- [Reset is disabled](#reset-is-disabled)
- [Razorpay outage](#razorpay-outage)
- [Participant asks for their data to be deleted](#participant-asks-for-their-data-to-be-deleted)

## Logs

Server logs are in Vercel under **Project → Logs**. Filter by these prefixes:

| Prefix | Source | Typical lines |
|---|---|---|
| `[payment/create-order]` | Order creation | Razorpay or database error; the participant saw "Could not initiate payment" |
| `[payment/verify]` | Client verify | Exception during verification |
| `[payment/status]` | Status polling | Exception during a status check |
| `[reconcile]` | Reconcile | `Razorpay fetch failed for order <ORDER_ID>` |
| `[webhook]` | Webhook | `RAZORPAY_WEBHOOK_SECRET not set`, `Processing failed: <MESSAGE>` |
| `[assessment/resume]` | Recovery requests | Exception during recovery |
| `POST /api/assessment/start failed:` | Registration | Exception during registration (no brackets) |
| `[email]` | Report emails | `Sent successfully to <EMAIL> on attempt <N>`, `Attempt <N> failed for <EMAIL>`, `All 3 attempts failed`, `Failed to create EmailLog` |
| `[pdf]` | PDF route | `Serving cached PDF`, `Generating PDF`, `Cached PDF`, `Failed to cache PDF` |
| `[regen-pdf]`, `[clear-pdf]` | Admin PDF actions | Exception |
| `[issue-token]`, `[revoke]`, `[extend]`, `[resend-email]` | Admin report actions | Exception |
| `[cleanup-orphans]`, `[cleanup-orphans-preview]` | Orphan cleanup | Exception |
| `[admin/reset]` | Reset | `RESET INITIATED`, `RESET COMPLETE`, `Failed to delete <TABLE>` |
| `[admin/payments/reconcile]` | Admin reconcile | Exception |
| `[audit]` | Audit log | `Failed to write audit log` |
| `Invalid environment variables:` | `src/lib/config.ts` | A required email or pricing variable is missing or invalid |

Razorpay keeps its own webhook delivery log under **Account & Settings → Webhooks**, and Resend keeps a log of every send under **Emails**.

## Useful queries

Find a participant's assessment ID, statuses and order ID:

```sql
SELECT p.id AS participant_id, a.id AS assessment_id, a.status AS assessment_status,
       pay.status AS payment_status, pay."razorpayOrderId", pay."razorpayPaymentId",
       r.id AS report_id
FROM "Participant" p
JOIN "Assessment" a ON a."participantId" = p.id
LEFT JOIN "Payment" pay ON pay."assessmentId" = a.id
LEFT JOIN "Report" r ON r."assessmentId" = a.id
WHERE p.email = '<EMAIL>'
ORDER BY a."startedAt" DESC;
```

Re-check one payment with Razorpay. Open any `/admin` page while signed in, open the browser's developer console, and run:

```js
fetch("/api/admin/payments/reconcile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ assessmentId: "<ASSESSMENT_ID>" }),
}).then((r) => r.json()).then(console.log);
```

It prints `{ status: "SUCCESS" }` if Razorpay has a captured payment for the stored order. The **Re-check with Razorpay** button does not work; use this instead.

## Quick reference

| Symptom | Most likely cause | First action |
|---|---|---|
| Paid, cannot see questions | Confirmation did not arrive | Participant uses `/assessment/resume` |
| Submit returns an error | Partial write on an earlier attempt | [Submission fails](#submission-fails) |
| Webhook 400 | Secret mismatch | Match `RAZORPAY_WEBHOOK_SECRET` with Razorpay |
| Webhook 500 | Processing error | Read `WebhookEvent.error` |
| No email | Resend domain or key | Read `EmailLog.error` |
| PDF slow | First render | None; later downloads are cached |
| Report link 404 | Link replaced, revoked or expired | Check Token Status; **Resend Email** |
| Admin login refused | Rate limit or configuration | Wait 15 minutes; check variables |
| Many participants get 429 | Shared IP or IP detection | Query `RateLimitHit` |
| Every page 500 | Database or missing variable | Check logs for the first error |

## Participant paid but cannot see the questions

Run the participant query from [Useful queries](#useful-queries) and check the Razorpay Dashboard for the stored order ID.

| Finding | Cause | Fix |
|---|---|---|
| Payment `CREATED` or `FAILED`; Razorpay shows a **Captured** payment on the stored order | Client verify failed and no webhook arrived | Ask the participant to use `/assessment/resume`, or run the reconcile snippet. Then check the webhook ([Webhook failing](#webhook-failing)). |
| Payment `SUCCESS`; assessment still `PAYMENT_PENDING`, `PAYMENT_FAILED` or `CREATED` | The server stopped between the payment write and the assessment write. Later confirmations return early because the payment is already `SUCCESS`, so they never repair it. | **Operator:** run the SQL below, then ask the participant to use `/assessment/resume`. |
| Payment `CREATED` or `FAILED`; Razorpay shows the captured payment on a **different** order ID | The participant started checkout twice and paid the older order. Each new order replaces the stored order ID, so neither the webhook nor reconcile can match the paid one. | **Operator:** run the second SQL statement below, then reconcile. |
| Nothing captured in Razorpay | The participant did not pay | Ask them to pay again from `/assessment` |
| Assessment `QUESTIONS_UNLOCKED` | Already unlocked | Send them `https://<YOUR_DOMAIN>/assessment/<ASSESSMENT_ID>/questions`, or ask them to use `/assessment/resume` |

Unlock an assessment whose payment is already `SUCCESS`:

```sql
UPDATE "Assessment" SET status = 'QUESTIONS_UNLOCKED'
WHERE id = '<ASSESSMENT_ID>' AND status <> 'COMPLETED'
  AND EXISTS (SELECT 1 FROM "Payment" WHERE "assessmentId" = '<ASSESSMENT_ID>' AND status = 'SUCCESS');
```

Point the payment at the order the participant actually paid:

```sql
UPDATE "Payment" SET "razorpayOrderId" = '<PAID_ORDER_ID>'
WHERE "assessmentId" = '<ASSESSMENT_ID>' AND status <> 'SUCCESS';
```

## Submission fails

The participant answered every question but gets an error on **Submit assessment**.

```sql
SELECT a.status,
       (SELECT count(*) FROM "Response" WHERE "assessmentId" = a.id) AS responses,
       (SELECT id FROM "Result" WHERE "assessmentId" = a.id) AS result_id,
       (SELECT id FROM "Report" WHERE "assessmentId" = a.id) AS report_id
FROM "Assessment" a WHERE a.id = '<ASSESSMENT_ID>';
```

| Finding | Cause | Fix |
|---|---|---|
| `status` is `QUESTIONS_UNLOCKED`, `result_id` set, `report_id` empty | An earlier attempt stopped after writing the result. Each retry fails on the unique `Result.assessmentId`. | **Operator:** `DELETE FROM "Result" WHERE "assessmentId" = '<ASSESSMENT_ID>';` then ask the participant to submit again. Their answers stay on the page only while the tab is open; if it was closed they must answer again (the resume page emails the questions link). |
| `status` is `QUESTIONS_UNLOCKED`, `result_id` and `report_id` set | An earlier attempt stopped before marking the assessment completed | **Operator:** `UPDATE "Assessment" SET status = 'COMPLETED', "completedAt" = now() WHERE id = '<ASSESSMENT_ID>';` then use **Resend Email** on the participant page to send a working link. |
| `status` is anything else | Not unlocked | See [the previous section](#participant-paid-but-cannot-see-the-questions) |

## Webhook failing

Check the Razorpay webhook delivery log first.

| Response in Razorpay | Log line | Cause | Fix |
|---|---|---|---|
| 400 `Bad signature` | `[webhook] RAZORPAY_WEBHOOK_SECRET not set`, or nothing | Secret unset, or different from the one in Razorpay; or test and live mode mixed | **Operator:** set `RAZORPAY_WEBHOOK_SECRET` to the webhook's secret, redeploy, then resend the failed events from Razorpay |
| 400 `Invalid JSON` | None | Not a Razorpay request | None |
| 500 `Processing error` | `[webhook] Processing failed: <MESSAGE>` | Database error, or an order ID mismatch in `markPaymentSucceeded` | Read the saved error (query below). Razorpay retries automatically; fix the cause and let it retry, or resend. |
| 404, 401 or timeout | None | Wrong URL, or a Vercel preview protected by Deployment Protection | Use `https://<YOUR_DOMAIN>/api/payment/webhook` on the production domain |

```sql
SELECT "eventId", event, "receivedAt", "processedAt", error
FROM "WebhookEvent" WHERE error IS NOT NULL OR "processedAt" IS NULL
ORDER BY "receivedAt" DESC LIMIT 20;
```

While webhooks fail, participants are still unlocked by client verify and by reconcile.

## Emails not arriving

```sql
SELECT recipient, status, error, "createdAt", "sentAt"
FROM "EmailLog" WHERE recipient = '<EMAIL>' ORDER BY "createdAt" DESC;
```

| Finding | Cause | Fix |
|---|---|---|
| No row | The send never started, or `[email] Failed to create EmailLog` | Check logs around the submission time; use **Resend Email** |
| `FAILED`, error mentions domain or sender | `EMAIL_FROM` is on a domain not verified in Resend | **Operator:** verify the domain ([DEPLOYMENT.md](DEPLOYMENT.md#6-verify-the-sending-domain-in-resend)); then **Resend Email** |
| `FAILED`, error mentions API key | `RESEND_API_KEY` invalid or revoked | **Operator:** replace the key and redeploy; then **Resend Email** |
| `PENDING` for more than a few minutes | The function stopped before finishing | **Resend Email** |
| `SENT` but not received | Spam folder, or rejected by the recipient's server | Ask the participant to check spam; look the message up in the Resend dashboard |
| Received, but the link opens the wrong site or does nothing | `NEXT_PUBLIC_BASE_URL` wrong or empty | **Operator:** fix it, redeploy, then **Resend Email** |

## PDF slow or failing

| Finding | Cause | Fix |
|---|---|---|
| Slow once, fast afterwards | First render; later downloads use the cache | None |
| Always slow; logs show `[pdf] Generating PDF` every time | The cache write fails (`[pdf] Failed to cache PDF`) | Read the error; click **Regen PDF**, which stores the PDF directly |
| All PDFs slow after a deploy | `PDF_TEMPLATE_VERSION` changed, so every cache entry is stale | None; each re-renders once |
| 500 when downloading | Rendering failed, or the function timed out | Read the Vercel function log; click **Regen PDF** to see `[regen-pdf]` with the error |
| 404 | No valid report link token | See [Report link returns 404](#report-link-returns-404) |

## Report link returns 404

Open the participant and read **Token Status** in the report access panel.

| Token Status | Cause | Fix |
|---|---|---|
| ACTIVE | The link is an old one. **Resend Email**, **Issue Token** and recovery emails each replace the previous link. | Ask the participant for the newest email, or click **Resend Email** |
| EXPIRED | Past the expiry date | **Extend 30 Days** (the link they have starts working again) |
| REVOKED | An admin revoked it | **Resend Email** if access should be restored |
| NONE | Legacy report and `ALLOW_LEGACY_REPORT_LINKS=false` | **Resend Email** |

Also check that the link contains `?t=` and that the report ID matches. **View Online Report** and **View** in the admin console always return 404 for reports with a token; that is expected.

```sql
SELECT id, "accessTokenHash" IS NOT NULL AS has_token, "accessTokenCreatedAt", "expiresAt", "revokedAt"
FROM "Report" WHERE id = '<REPORT_ID>';
```

## Admin login returns 429, 500 or keeps failing

The login page shows "Invalid email or password" for every failure. Use the browser's developer tools (**Network** tab) to see the real status.

| Status | Cause | Fix |
|---|---|---|
| 429 | 10 attempts from this IP, or 10 failures for this email, in 15 minutes | Wait for the time in `Retry-After`. **Operator** can clear it: `DELETE FROM "RateLimitHit" WHERE key LIKE 'login:%';` |
| 500 `Server configuration error` | `ADMIN_EMAIL` or `ADMIN_PASSWORD_HASH` unset | **Operator:** set them and redeploy |
| 400 with the correct password | `ADMIN_SESSION_SECRET` unset | **Operator:** set it and redeploy |
| 401 with the correct password | Email differs in case from `ADMIN_EMAIL`, or the hash was mangled (`$` expanded or quotes pasted into Vercel) | **Operator:** see [CONFIGURATION.md](CONFIGURATION.md#notes-and-pitfalls); regenerate the hash if unsure |
| Signed in, then sent back to login | Session older than 24 hours, or `ADMIN_SESSION_SECRET` changed | Sign in again |

## Rate limits blocking real participants

The limits are constants in code ([API.md](API.md#rate-limits)). Changing them needs a code change and deploy.

```sql
SELECT key, count(*) AS hits, max("createdAt") AS last_hit
FROM "RateLimitHit" WHERE "createdAt" > now() - interval '1 hour'
GROUP BY key ORDER BY hits DESC LIMIT 20;
```

| Finding | Cause | Fix |
|---|---|---|
| One `start:ip:` or `create-order:ip:` key near 10 | Many participants behind one network (office, campus) share the 10-per-hour limit | Clear that key: `DELETE FROM "RateLimitHit" WHERE key = '<KEY>';` |
| A key ending in `unknown`, or one address taking every hit | The client IP is not being detected, so everyone shares a key; usually an extra proxy or CDN in front of Vercel | Clear the key and review `src/lib/client-ip.ts` for your hosting setup |
| Many different keys | Genuine traffic spike or abuse | Usually leave the limits in place |

## Database will not connect

Every page that reads data returns 500.

| Log line | Cause | Fix |
|---|---|---|
| `DATABASE_URL environment variable is not set.` | Variable missing | **Operator:** set it and redeploy |
| Connection refused, timeout, `ENOTFOUND` | Provider outage, suspended compute, wrong host | Check the provider's status; test with `node --env-file=<ENV_FILE> scripts/db-check.mjs` |
| `password authentication failed` | Password rotated | Update `DATABASE_URL` and `DIRECT_URL`; redeploy |
| Too many connections | Using the direct URL at runtime | Use the pooled URL for `DATABASE_URL` |

## Migration failed

| Symptom | Cause | Fix |
|---|---|---|
| `Prisma Migrations require a non-pooled connection to Neon.` | `DIRECT_URL` unset while `DATABASE_URL` is pooled | Set `DIRECT_URL` |
| `P1001` cannot reach database | Wrong URL or network | Check the URL; use the direct host |
| `migrate status` lists a failed migration | The SQL stopped partway | See [DEPLOYMENT.md](DEPLOYMENT.md#rolling-back) |
| The app errors on a missing column after deploy | Code deployed before its migration | Run `npx prisma migrate deploy` |

## Reset is disabled

The Evidence page shows "Reset Disabled", or the reset returns 403.

**Operator:** set `ALLOW_DATA_RESET` to exactly `true` (lowercase) and redeploy. Set it back to `false` and redeploy once the reset is done.

## Razorpay outage

| Symptom | Effect |
|---|---|
| `[payment/create-order]` errors; participants see "Could not initiate payment" | New payments cannot start |
| `[reconcile] Razorpay fetch failed` | Status polling and recovery cannot confirm payments |
| Webhooks delayed | Confirmations arrive late |

Nothing needs to change in the app. Razorpay retries webhooks when it recovers, and payments already made are unlocked then. Participants who could not continue can use `/assessment/resume` afterwards. Check Razorpay's status page for progress.

## Participant asks for their data to be deleted

**Operator:** follow [SECURITY.md](SECURITY.md#deleting-one-participants-data). There is no admin button for it.
