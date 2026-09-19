# API reference

**Audience:** developer

All endpoints are Next.js route handlers under `src/app/api/`. Bodies are JSON unless stated. There are 22 route files.

## Contents

- [Auth model](#auth-model)
- [Errors](#errors)
- [Rate limits](#rate-limits)
- [Participant endpoints](#participant-endpoints)
- [Payment endpoints](#payment-endpoints)
- [Webhook](#webhook)
- [Report endpoints](#report-endpoints)
- [Admin endpoints](#admin-endpoints)

## Auth model

| Level | How it is checked | Used by |
|---|---|---|
| Public | Nothing | Start, create-order, verify, status, resume, webhook, admin login and logout |
| Assessment ID | Knowing the assessment ID (a UUID) plus the assessment's status | Questions and submit |
| Report token | `?t=<TOKEN>` query parameter, checked by `checkReportAccess` in `src/lib/report-token.ts` | `GET /api/report/<REPORT_ID>` and the PDF route |
| Admin session | `admin_session` cookie, checked by `src/proxy.ts` for every `/api/admin/*` path except login and logout, and again inside most handlers with `requireAdmin()` | All other `/api/admin/*` routes. The PDF route also accepts it instead of a token. |

`checkReportAccess` returns one of these results. Every result except `ok` becomes a 404, so a caller cannot tell a wrong token from a missing report.

| Result | Condition |
|---|---|
| `revoked` | `revokedAt` is set. Checked first. |
| `ok` | The report has no token hash (legacy) and `ALLOW_LEGACY_REPORT_LINKS` is not `false` |
| `not_found` | The report has no token hash and `ALLOW_LEGACY_REPORT_LINKS=false` |
| `bad_token` | No token given, or its SHA-256 does not match |
| `expired` | `expiresAt` is in the past |
| `ok` | Token matches and has not expired |

How the session cookie is issued and verified is covered in [ARCHITECTURE.md](ARCHITECTURE.md#request-lifecycle) and [SECURITY.md](SECURITY.md).

## Errors

There is no single error format. Each endpoint's table lists its bodies.

| Style | Body | Used by |
|---|---|---|
| JSON | `{"error": "<message>"}`, sometimes with `"details"` (Zod `flatten()` output) | Most routes |
| Plain text | `Unauthorized`, `Too Many Requests`, `Bad signature`, `Report not found` and similar | Admin login and logout, the webhook, the PDF route, `requireAdmin()` failures, and `src/proxy.ts` |

A request body that is not valid JSON is reported as 400 on some routes and 500 on others. The tables say which.

## Rate limits

Limits are counted in the `RateLimitHit` table by `src/lib/rate-limit.ts`. A request that is allowed adds a row. A request that is refused does not. The window slides: the retry time is when the oldest hit in the window expires.

The client IP is the right-most entry of `X-Forwarded-For`, then `X-Real-IP`, then the literal `unknown` (`src/lib/client-ip.ts`).

| Endpoint | Key | Limit | Window | When exceeded |
|---|---|---|---|---|
| `POST /api/assessment/start` | `start:ip:<IP>` | 10 | 1 hour | 429 JSON |
| `POST /api/payment/create-order` | `create-order:ip:<IP>` | 10 | 1 hour | 429 JSON |
| `POST /api/payment/status` | `payment-status:ip:<IP>` | 10 | 1 minute | 429 JSON |
| `POST /api/assessment/resume` | `resume:ip:<IP>` | 5 | 1 minute | 200 with the usual neutral message; nothing is sent |
| `POST /api/assessment/resume` | `resume:email:<EMAIL>` | 3 | 1 minute | Same as above |
| `POST /api/admin/login` | `login:ip:<IP>` | 10 | 15 minutes | 429 plain text. Counts every attempt, including successful ones. |
| `POST /api/admin/login` | `login:email:<EMAIL>` | 10 | 15 minutes | 429 plain text. Counted only after a failed attempt. |

A 429 carries a `Retry-After` header in whole seconds:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 2893
Content-Type: application/json

{"error":"Too many requests"}
```

`/api/admin/login` returns the body `Too Many Requests` as plain text. Other endpoints, including verify, submit, questions and the webhook, have no rate limit.

## Participant endpoints

### POST /api/assessment/start

Registers a participant and creates an assessment.

| | |
|---|---|
| Auth | Public |
| Rate limit | `start:ip`, 10 per hour |
| Idempotent | No. Every call creates a new participant and assessment. |

Request. `name` is trimmed, 2 to 100 characters. `email` must be a valid email up to 200 characters and is lowercased. `phone` must match `^\+?[0-9\s\-()]{7,20}$`.

```json
{
  "name": "<FULL_NAME>",
  "email": "<EMAIL>",
  "phone": "+91 <PHONE_NUMBER>"
}
```

Response `200`:

```json
{ "assessmentId": "<ASSESSMENT_ID>" }
```

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Invalid input","details":{...}}` | Validation failed |
| 429 | `{"error":"Too many requests"}` | Rate limit |
| 500 | `{"error":"Unable to start assessment. Please try again."}` | Invalid JSON body or database error |

Side effects: creates `Participant`, then `Assessment` with status `CREATED`, as two separate writes.

### GET /api/assessment/{assessmentId}/questions

Returns the 50 questions without trait or scoring data.

| | |
|---|---|
| Auth | Assessment ID; status must be `QUESTIONS_UNLOCKED` |
| Rate limit | None |
| Idempotent | Yes (read-only) |

Response `200`, 50 items ordered by `order`:

```json
{
  "questions": [
    { "id": "O1", "text": "I enjoy exploring new ideas and concepts.", "order": 1 }
  ]
}
```

| Status | Body | When |
|---|---|---|
| 403 | `{"error":"Assessment not unlocked"}` | Any status other than `QUESTIONS_UNLOCKED`, including `COMPLETED` |
| 404 | `{"error":"Assessment not found"}` | Unknown assessment ID |

### POST /api/assessment/{assessmentId}/submit

Scores the answers, stores the result and report, and emails the report link.

| | |
|---|---|
| Auth | Assessment ID; status must be `QUESTIONS_UNLOCKED` |
| Rate limit | None |
| Idempotent | Partly. A completed assessment returns the existing report ID without a token. |

Request. `responses` must have exactly 50 entries. Each `answer` is an integer from 1 to 5, and each `questionId` must be a known question ID.

```json
{
  "responses": [
    { "questionId": "O1", "answer": 4 },
    { "questionId": "O2", "answer": 3 }
  ]
}
```

Response `200` on first submission. `reportToken` is the raw report link token. It is returned only here and never stored.

```json
{ "reportId": "<REPORT_ID>", "reportToken": "<REPORT_TOKEN>" }
```

Response `200` when the assessment is already `COMPLETED`:

```json
{ "reportId": "<REPORT_ID>", "alreadySubmitted": true }
```

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Invalid responses","details":{...}}` | Wrong count, or an answer outside 1 to 5 |
| 400 | `{"error":"Unknown question ID: <ID>"}` | A question ID not in the question set |
| 403 | `{"error":"Assessment not ready for submission"}` | Status is not `QUESTIONS_UNLOCKED` or `COMPLETED` |
| 404 | `{"error":"Assessment not found"}` | Unknown assessment ID |
| 500 | Next.js default error | Invalid JSON; 50 entries with a repeated question ID; a retry after a partial write (the `Result` insert fails on its unique constraint) |

Side effects, in order:

1. Inserts `Response` rows, skipping duplicates.
2. Inserts `Result`.
3. Inserts `Report` with the token hash, `accessTokenCreatedAt` and `expiresAt` (now plus `REPORT_TOKEN_TTL_DAYS`).
4. Sets the assessment to `COMPLETED` with `completedAt`.
5. `after()`: sends the report email with the link `<NEXT_PUBLIC_BASE_URL>/report/<REPORT_ID>?t=<TOKEN>`.
6. `after()`: requests the PDF once to fill the cache.

Scoring is described in [SCORING.md](SCORING.md).

### POST /api/assessment/resume

Emails recovery links to a participant's email address.

| | |
|---|---|
| Auth | Public |
| Rate limit | `resume:ip` 5 per minute; `resume:email` 3 per minute |
| Idempotent | No. Each call can send emails and issues new report tokens. |

Request:

```json
{ "email": "<EMAIL>" }
```

Response: always `200`, whatever happens, including invalid input, rate limiting and internal errors:

```json
{ "message": "If we found an assessment, a recovery link has been sent." }
```

Side effects, for every assessment of every participant with that email:

1. Runs reconcile if the payment is `CREATED` or `PENDING`.
2. `COMPLETED` with a report: issues a new token, which invalidates the previous report link, and emails `<BASE_URL>/report/<REPORT_ID>?t=<TOKEN>`.
3. `QUESTIONS_UNLOCKED`: emails `<BASE_URL>/assessment/<ASSESSMENT_ID>/questions`.

The participant-side flow is in [PAYMENTS.md](PAYMENTS.md#resume-and-recovery).

## Payment endpoints

### POST /api/payment/create-order

Creates a Razorpay order for an assessment.

| | |
|---|---|
| Auth | Public; the assessment must exist |
| Rate limit | `create-order:ip`, 10 per hour |
| Idempotent | No. Every call creates a new Razorpay order and replaces the stored order ID. |

Request:

```json
{ "assessmentId": "<ASSESSMENT_ID>" }
```

Response `200`. `amount` is in paise.

```json
{ "orderId": "order_<RAZORPAY_ORDER_ID>", "amount": 9900, "currency": "INR" }
```

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Invalid input"}` | `assessmentId` is not a UUID |
| 404 | `{"error":"Assessment not found"}` | Unknown assessment ID |
| 409 | `{"error":"Payment already completed"}` | The payment is already `SUCCESS` |
| 429 | `{"error":"Too many requests"}` | Rate limit |
| 500 | `{"error":"Failed to create payment order"}` | Invalid JSON, Razorpay error or database error |

Side effects: creates a Razorpay order (receipt is the first 40 characters of the assessment ID); upserts `Payment` with the configured amount, currency and status `CREATED`; sets the assessment to `PAYMENT_PENDING`.

### POST /api/payment/verify

Confirms a payment from the checkout success handler.

| | |
|---|---|
| Auth | Public; the Razorpay signature is the proof |
| Rate limit | None |
| Idempotent | Yes. An already-`SUCCESS` payment returns 200 before any check. |

Request:

```json
{
  "assessmentId": "<ASSESSMENT_ID>",
  "razorpayOrderId": "order_<RAZORPAY_ORDER_ID>",
  "razorpayPaymentId": "pay_<RAZORPAY_PAYMENT_ID>",
  "razorpaySignature": "<HEX_SIGNATURE>"
}
```

Response `200`:

```json
{ "assessmentId": "<ASSESSMENT_ID>" }
```

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Invalid input"}` | Validation failed |
| 400 | `{"error":"Order ID mismatch"}` | `razorpayOrderId` differs from the stored order ID |
| 400 | `{"error":"Invalid payment signature"}` | Signature check failed. Also marks the payment `FAILED`. |
| 404 | `{"error":"Payment record not found"}` | No payment for this assessment |
| 500 | `{"error":"Payment verification failed"}` | Invalid JSON or database error |

Side effects: `markPaymentSucceeded` with `confirmedVia = client_verify`, or `markPaymentFailed` on a bad signature. See [PAYMENTS.md](PAYMENTS.md#status-machines).

### POST /api/payment/status

Runs reconcile, then reports the current state. The checkout page polls it.

| | |
|---|---|
| Auth | Public |
| Rate limit | `payment-status:ip`, 10 per minute |
| Idempotent | Yes in effect. It can unlock an assessment, and unlocking is idempotent. |

Request:

```json
{ "assessmentId": "<ASSESSMENT_ID>" }
```

Response `200`:

```json
{ "paymentStatus": "SUCCESS", "assessmentStatus": "QUESTIONS_UNLOCKED" }
```

`paymentStatus` is `NONE` (no payment row), `CREATED`, `PENDING`, `SUCCESS` or `FAILED`. It reports `FAILED` when Razorpay shows a failed attempt and no capture, even though the stored status is not changed. `assessmentStatus` is an `AssessmentStatus` value, or `NOT_FOUND`.

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Invalid input"}` | Invalid JSON or a non-UUID ID |
| 429 | `{"error":"Too many requests"}` | Rate limit |
| 500 | `{"error":"Status check failed"}` | Database error |

A Razorpay API error is logged as `[reconcile]` and does not fail the request.

## Webhook

### POST /api/payment/webhook

Receives Razorpay events.

| | |
|---|---|
| Auth | HMAC signature in `X-Razorpay-Signature` |
| Rate limit | None |
| Idempotent | Yes, by `X-Razorpay-Event-Id` |

**Signature verification.** The handler reads the body as raw text before parsing it. It computes `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` as hex and compares it with the header in constant time, after a length check. If `RAZORPAY_WEBHOOK_SECRET` is unset, every request fails verification.

**Events handled:**

| Event | Action |
|---|---|
| `payment.captured` | Order ID from `payload.payment.entity.order_id`. Finds the `Payment` by `razorpayOrderId` and calls `markPaymentSucceeded` with `confirmedVia = webhook`. |
| `order.paid` | Same, using `payload.payment.entity.order_id` or `payload.order.entity.id` |
| `payment.failed` | Finds the `Payment` by order ID and calls `markPaymentFailed`, which does nothing to a `SUCCESS` payment |
| Anything else | Acknowledged with 200 and ignored |

If no `Payment` has that order ID, nothing is changed and the response is 200. If the payload has no payment ID, the stored `razorpayPaymentId` is set to `rzp_<TIMESTAMP>`.

**Duplicates.** When the event ID header is present, the handler upserts a `WebhookEvent` row. If the row already has `processedAt` and no `error`, it returns 200 without processing. After successful processing it sets `processedAt`. Without the header, there is no deduplication, but a repeated event is still harmless because unlocking is idempotent.

**Replay.** The signature covers only the body, not a timestamp, so a captured request stays valid. A replayed event is either skipped by event ID or has no further effect.

| Status | Body | When |
|---|---|---|
| 200 | `OK` | Processed, ignored or already processed |
| 400 | `Bad signature` | Signature missing, wrong, or secret not configured |
| 400 | `Invalid JSON` | Body is not JSON |
| 500 | `Processing error` | An exception while processing. The error is saved on the `WebhookEvent` row and `processedAt` stays empty. |

**Retries.** Razorpay retries deliveries that do not get a 2xx response. A 500 therefore leads to a retry, and a retry of a failed event is processed again because its row has an `error`. A 400 is not fixed by retrying: fix the secret, then resend the event from the Razorpay dashboard. Razorpay's retry schedule is set by Razorpay, not by this app.

Setup steps are in [PAYMENTS.md](PAYMENTS.md#webhook).

## Report endpoints

### GET /api/report/{reportId}

Returns a report as JSON.

| | |
|---|---|
| Auth | Report token `?t=<TOKEN>` |
| Rate limit | None |
| Idempotent | Yes (read-only) |

Response `200`, with `Cache-Control: private, no-store`. `content` is the full `ReportData` object from `src/types/index.ts`.

```json
{
  "content": { "participantName": "<FULL_NAME>", "scores": { "openness": 75 } },
  "assessmentId": "<ASSESSMENT_ID>",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "accessTokenHash": "<SHA256_HEX>",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "revokedAt": null
}
```

| Status | Body | When |
|---|---|---|
| 404 | `{"error":"Report not found"}` | Unknown report ID, or any access result other than `ok` |

### GET /api/report/{reportId}/pdf

Returns the report as a PDF download.

| | |
|---|---|
| Auth | Report token `?t=<TOKEN>`, or an admin session |
| Rate limit | None |
| Idempotent | Yes. It may write the cache. |

Response `200` with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="psychometric-report-<name-with-hyphens>.pdf"` and `Cache-Control: private, no-store`.

| Status | Body | When |
|---|---|---|
| 404 | `Report not found` (plain text) | Unknown report ID, or access denied |
| 500 | Next.js default error | PDF rendering failed |

**Cache.** The route computes `SHA-256(JSON.stringify(content) + PDF_TEMPLATE_VERSION)`. If a `ReportPdf` row has the same `contentHash`, its bytes are served (log line `[pdf] Serving cached PDF`). Otherwise the PDF is rendered, returned, and saved in `after()` (log `[pdf] Cached PDF` or `[pdf] Failed to cache PDF`).

## Admin endpoints

Every endpoint in this section needs an admin session, except login and logout. Without one, `src/proxy.ts` returns plain-text `401 Unauthorized` before the handler runs. The admin-facing description of each action is in [ADMIN_GUIDE.md](ADMIN_GUIDE.md).

### POST /api/admin/login

| | |
|---|---|
| Auth | Public |
| Rate limit | `login:ip` 10 per 15 minutes on every attempt; `login:email` 10 per 15 minutes on failed attempts |

Request:

```json
{ "email": "<ADMIN_EMAIL>", "password": "<PASSWORD>" }
```

Response `200`, body `OK`, with `Set-Cookie: admin_session=...; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`, plus `Secure` in production.

| Status | Body | When |
|---|---|---|
| 400 | `Bad Request` | Invalid JSON, missing password, or the session could not be created (for example, `ADMIN_SESSION_SECRET` unset) |
| 401 | `Unauthorized` | Wrong email or password |
| 429 | `Too Many Requests` | Either limit reached |
| 500 | `Server configuration error` | `ADMIN_EMAIL` or `ADMIN_PASSWORD_HASH` unset |

Side effects: audit `ADMIN_LOGIN` with `{"ip": "<IP>"}`.

### POST /api/admin/logout

Always returns `200` with body `OK` and deletes the `admin_session` cookie. It needs no session and writes no audit entry.

### GET /api/admin/evidence/export

Downloads a CSV of all participants.

Response `200` with `Content-Type: text/csv; charset=utf-8` and filename `psychometric-pro-evidence.csv`. One row per participant, newest first, using the participant's latest payment and latest assessment:

| Column | Source |
|---|---|
| Participant ID | `Participant.id` |
| Name | Double-quoted |
| Email | Unquoted |
| Created At | ISO timestamp |
| Payment Status | Latest payment status, or `NONE` |
| Payment Gateway | Always `Razorpay` |
| Payment Method | Always `Not available` |
| Amount (INR) | Rupees if `SUCCESS`, otherwise `0` |
| Razorpay Order ID | |
| Razorpay Payment ID | |
| Assessment Status | Latest assessment status, or `NONE` |
| Report ID | |

No audit entry. This handler does not call `requireAdmin()`; it relies on `src/proxy.ts`.

### POST /api/admin/payments/reconcile

Runs reconcile for one assessment.

Request:

```json
{ "assessmentId": "<ASSESSMENT_ID>" }
```

Response `200`:

```json
{ "status": "SUCCESS" }
```

`status` has the same values as `paymentStatus` in [the status endpoint](#post-apipaymentstatus).

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Invalid input","details":{...}}` | Invalid JSON or a non-UUID ID |
| 401 | `{"error":"Unauthorized"}` | No valid session |
| 500 | `{"error":"Reconciliation failed"}` | Database error |

Side effects: may unlock the assessment with `confirmedVia = reconcile`. No audit entry.

The **Re-check with Razorpay** button on the participant page posts to this endpoint as an HTML form (`application/x-www-form-urlencoded`). The handler parses only JSON, so that button always receives `400 Invalid input` and reconciles nothing. Send JSON as shown above.

### GET and POST /api/admin/participants/cleanup

`GET` previews and `POST` deletes orphaned participants. The selection rule and what is deleted are in [DATABASE.md](DATABASE.md#orphan-cleanup).

| Method | Response `200` |
|---|---|
| `GET` | `{"totalOrphans": 3}` |
| `POST` | `{"success": true, "deleted": 3}` |

| Status | Body | When |
|---|---|---|
| 401 | `Unauthorized` | No valid session |
| 500 | `{"error":"Failed to count orphans"}` or `{"error":"Failed to cleanup orphans"}` | Database error. A `POST` can fail partway, leaving some participants deleted. |

Side effects of `POST`: deletes rows; audit `DELETE_ORPHANS` with `{"count": 3, "orphanIds": ["<ID>"]}` when at least one participant was deleted.

### GET and DELETE /api/admin/reset

`GET` returns current row counts:

```json
{ "counts": { "participants": 0, "assessments": 0, "responses": 0, "payments": 0, "results": 0, "reports": 0, "reportPdfs": 0 } }
```

`DELETE` deletes all participant data. The request must carry the exact phrase:

```json
{ "confirmation": "DELETE ALL TEST DATA" }
```

Response `200`:

```json
{
  "success": true,
  "deleted": { "responses": 0, "reportPdfs": 0, "reports": 0, "results": 0, "payments": 0, "assessments": 0, "participants": 0 },
  "counts": { "participants": 0, "assessments": 0, "responses": 0, "payments": 0, "results": 0, "reports": 0, "reportPdfs": 0 }
}
```

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Invalid request body."}` | Invalid JSON |
| 400 | `{"error":"Confirmation phrase did not match."}` | Wrong or missing phrase |
| 401 | `Unauthorized` | No valid session |
| 403 | `{"error":"Reset is disabled. Set ALLOW_DATA_RESET=true and redeploy."}` | `ALLOW_DATA_RESET` is not `true` |
| 500 | `{"error":"Partial failure. Some tables may not have been fully cleared.","errors":[],"deleted":{},"counts":{}}` | At least one table failed |

Side effects: the deletions listed in [DATABASE.md](DATABASE.md#reset-test-data). It logs `[admin/reset] RESET INITIATED` and `[admin/reset] RESET COMPLETE` to the server log. It writes **no** audit log row.

### POST /api/admin/reports/{reportId}/revoke

Sets `revokedAt` to now. The report link and PDF then return 404 for the participant.

Response `200`: `{"success": true}`. Errors: `401 Unauthorized`; `500 {"error":"Failed to revoke report"}` (also for an unknown report ID). Audit: `REVOKE_REPORT_TOKEN` with `{"reportId": "<REPORT_ID>"}`.

### POST /api/admin/reports/{reportId}/issue-token

Issues a new report link token: new hash, `accessTokenCreatedAt` now, `expiresAt` now plus `REPORT_TOKEN_TTL_DAYS`, and `revokedAt` cleared. The previous link stops working.

Response `200`. The raw token is returned only once.

```json
{ "success": true, "token": "<REPORT_TOKEN>" }
```

Errors: `401 Unauthorized`; `500 {"error":"Failed to issue token"}` (also for an unknown report ID). Audit: `ISSUE_REPORT_TOKEN` with `{"reportId": "<REPORT_ID>"}`.

### POST /api/admin/reports/{reportId}/extend

Moves `expiresAt` forward by `days`. The count starts from the current expiry if it is in the future, otherwise from now. It does not clear a revocation.

Request. `days` must be a positive number; anything else becomes 30.

```json
{ "days": 30 }
```

Response `200`:

```json
{ "success": true, "newExpiry": "2027-02-01T00:00:00.000Z" }
```

| Status | Body | When |
|---|---|---|
| 401 | `Unauthorized` | No valid session |
| 404 | `{"error":"Report not found"}` | Unknown report ID |
| 500 | `{"error":"Failed to extend token"}` | Missing or invalid JSON body, or database error |

Audit: `EXTEND_REPORT_TOKEN` with `{"reportId": "<REPORT_ID>", "addDays": 30, "newExpiry": "<ISO_DATE>"}`.

### POST /api/admin/reports/{reportId}/resend-email

Issues a new report link token, which invalidates the previous link, and emails the new link to the participant.

Response `200`: `{"success": true}`. Errors: `401 Unauthorized`; `404 {"error":"Report not found"}`; `500 {"error":"Failed to resend email"}`. The email is sent in `after()`, so a 200 means it was queued, not delivered. Audit: `RESEND_REPORT_EMAIL` with `{"reportId": "<REPORT_ID>"}`.

### POST /api/admin/reports/{reportId}/regen-pdf

Renders the PDF now and stores it in `ReportPdf`, replacing any cached copy.

Response `200`: `{"success": true}`. Errors: `401 Unauthorized`; `404 {"error":"Report not found"}`; `500 {"error":"Failed to regenerate PDF"}`. Audit: `REGEN_PDF` with `{"reportId": "<REPORT_ID>"}`.

### POST /api/admin/reports/{reportId}/clear-pdf

Deletes the cached PDF. The next download renders a fresh one.

Response `200`: `{"success": true}`, including when there was no cached PDF or the report ID is unknown. Error: `401 Unauthorized`. Audit: `CLEAR_PDF_CACHE` with `{"reportId": "<REPORT_ID>"}`.
