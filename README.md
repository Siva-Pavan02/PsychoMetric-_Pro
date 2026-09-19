# PsychoMetric Pro

A paid, self-serve **Big Five (OCEAN) personality assessment** platform. A participant enters their details, pays ₹99 through Razorpay, answers 50 Likert-scale questions, and immediately receives a personalised report on screen, as a downloadable PDF, and by email. Operators get a password-protected admin console for participants, payments, reports, response-quality analytics and an audit CSV.

> PsychoMetric Pro is a self-development tool. Results are self-reported tendencies, not a clinical diagnosis.

---

## Contents

1. [Tech stack](#tech-stack)
2. [Quick start](#quick-start)
3. [Environment variables](#environment-variables)
4. [Project structure](#project-structure)
5. [How it works](#how-it-works)
6. [Assessment lifecycle](#assessment-lifecycle)
7. [Scoring & interpretation](#scoring--interpretation)
8. [API reference](#api-reference)
9. [Data model](#data-model)
10. [Admin console](#admin-console)
11. [Security](#security)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Known limitations](#known-limitations)
15. [Troubleshooting](#troubleshooting)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Route Handlers), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Payments | Razorpay Checkout (orders + server-side HMAC signature verification) |
| PDF | `@react-pdf/renderer` (rendered server-side on the Node.js runtime) |
| Email | Resend |
| Validation | Zod 4 |
| Auth | `bcryptjs` password check + HMAC-signed, HttpOnly session cookie |
| Tests | Jest 30 + ts-jest |
| Hosting | Vercel (recommended) + any managed Postgres (Neon, Supabase, …) |

---

## Quick start

**Prerequisites:** Node.js 20.16+ (or 22.3+), npm, and a PostgreSQL database. A Razorpay account in **Test Mode** is enough for local development.

```bash
# 1. Install dependencies (postinstall runs `prisma generate`)
npm install

# 2. Create your env file and fill in the values (see next section)
cp .env.example .env.local   # or create .env.local by hand

# 3. Create the database tables
npx prisma migrate dev

# 4. (optional) Confirm the DB is reachable and tables exist
node --env-file=.env.local scripts/db-check.mjs

# 5. Run the app
npm run dev
```

Open <http://localhost:3000> for the participant flow and <http://localhost:3000/admin/login> for the admin console.

### npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Jest unit tests |
| `postinstall` | `prisma generate` (runs automatically) |

---

## Environment variables

All `.env*` files are git-ignored. Never commit real secrets.

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | server | PostgreSQL connection string. The app throws on startup without it. |
| `RAZORPAY_KEY_ID` | ✅ | server | Razorpay key ID used to create orders. `src/lib/razorpay.ts` throws if missing. |
| `RAZORPAY_KEY_SECRET` | ✅ | server | Razorpay secret; also the HMAC key for payment signature checks. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✅ | browser | Same key ID, exposed to the Checkout widget. |
| `ADMIN_EMAIL` | ✅ | server | The single admin login email. |
| `ADMIN_PASSWORD_HASH` | ✅ | server | bcrypt hash of the admin password (never the plain password). |
| `ADMIN_SESSION_SECRET` | ✅ | server | 32+ character random string used to sign session cookies. Keep it separate from the password hash. |
| `NEXT_PUBLIC_BASE_URL` | recommended | both | Public site URL, used to build the report link in emails (e.g. `https://yourdomain.com`). |
| `RESEND_API_KEY` | optional | server | Enables the "report ready" email. If unset, email is skipped with a warning. |
| `ALLOW_DATA_RESET` | optional | server | Set to `true` only when you intend to wipe test data from the admin console. Default: off. |

Example `.env.local`:

```dotenv
DATABASE_URL="postgresql://user:password@host:5432/psychometric?sslmode=require"

RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD_HASH="$2b$12$...."
ADMIN_SESSION_SECRET="replace-with-a-long-random-string"

NEXT_PUBLIC_BASE_URL="http://localhost:3000"
RESEND_API_KEY="re_xxxxxxxx"
ALLOW_DATA_RESET="false"
```

Generate the two admin secrets:

```bash
# bcrypt hash for ADMIN_PASSWORD_HASH
node -e "console.log(require('bcryptjs').hashSync('your-strong-password', 12))"

# random value for ADMIN_SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> When putting a bcrypt hash in a `.env` file, wrap it in quotes — the `$` characters can otherwise be interpolated by some loaders.

---

## Project structure

```
.
├── prisma/
│   ├── schema.prisma              # Data model (6 models, 2 enums)
│   └── migrations/                # SQL migrations (init: 2026-08-16)
├── scripts/
│   ├── db-check.mjs               # DB connectivity + table listing smoke test
│   ├── e2e-api.mjs                # End-to-end API walk-through against localhost
│   └── generate_docs.js           # Regenerates the short docs/*.md files
├── docs/                          # Short topic notes (overview, flows, security…)
└── src/
    ├── proxy.ts                   # Route guard for /admin and /api/admin (Next 16 "proxy", formerly middleware)
    ├── app/
    │   ├── page.tsx               # Landing page
    │   ├── site-footer.tsx        # Footer + contact form
    │   ├── assessment/
    │   │   ├── page.tsx           # Details form + Razorpay checkout
    │   │   └── [id]/questions/    # 50-question flow (unlocked after payment)
    │   ├── report/[id]/page.tsx   # On-screen report
    │   ├── admin/                 # Admin console (login, overview, participants,
    │   │                          #   payments, reports, responses, evidence/reset)
    │   └── api/
    │       ├── assessment/start/
    │       ├── assessment/[token]/questions/
    │       ├── assessment/[token]/submit/
    │       ├── payment/create-order/
    │       ├── payment/verify/
    │       ├── report/[id]/        # JSON report
    │       ├── report/[id]/pdf/    # PDF download
    │       └── admin/              # login, logout, reset, evidence/export
    ├── data/questions.ts          # The 50 items (trait + reverse flag are server-only)
    ├── lib/
    │   ├── db.ts                  # Prisma client singleton (pg adapter)
    │   ├── auth.ts                # Session create / verify / clear
    │   ├── razorpay.ts            # Client, price constant, signature verification
    │   ├── email.ts               # Resend "report ready" email
    │   ├── scoring/engine.ts      # Deterministic OCEAN scoring
    │   ├── scoring/interpret.ts   # Scores → ReportData (levels, insights, plan)
    │   ├── scoring/analytics.ts   # Admin response analytics
    │   ├── admin/metrics.ts       # Dashboard aggregates, paise→rupee helpers
    │   └── pdf/ReportDocument.tsx # React-PDF report layout
    ├── types/index.ts             # Trait, Question, TraitScores, ReportData …
    └── __tests__/                 # Jest suites
```

---

## How it works

```mermaid
sequenceDiagram
    participant U as Participant (browser)
    participant A as Next.js API
    participant R as Razorpay
    participant D as PostgreSQL
    participant E as Resend

    U->>A: POST /api/assessment/start {name, email, phone}
    A->>D: create Participant + Assessment (CREATED)
    A-->>U: { assessmentId }
    U->>A: POST /api/payment/create-order { assessmentId }
    A->>R: orders.create(₹99)
    A->>D: upsert Payment (CREATED), Assessment → PAYMENT_PENDING
    A-->>U: { orderId, amount, currency }
    U->>R: Checkout modal (UPI / card / netbanking / wallet)
    R-->>U: { order_id, payment_id, signature }
    U->>A: POST /api/payment/verify
    A->>A: HMAC-SHA256(order_id|payment_id) vs signature
    A->>D: Payment → SUCCESS, Assessment → QUESTIONS_UNLOCKED
    U->>A: GET /api/assessment/{id}/questions
    A-->>U: 50 × {id, text, order}
    U->>A: POST /api/assessment/{id}/submit { responses[50] }
    A->>A: scoreAssessment() → interpretScores()
    A->>D: Responses, Result, Report; Assessment → COMPLETED
    A--)E: "Your report is ready" (fire-and-forget)
    A-->>U: { reportId }
    U->>A: GET /report/{reportId}  ·  GET /api/report/{reportId}/pdf
```

The browser never sees which trait a question belongs to or whether it is reverse-scored — the questions endpoint returns only `id`, `text` and `order`, and all scoring runs on the server.

---

## Assessment lifecycle

`Assessment.status` is the single source of truth for what a participant may do next.

```
CREATED ──create-order──▶ PAYMENT_PENDING ──verify ok──▶ QUESTIONS_UNLOCKED ──submit──▶ COMPLETED
                                │
                                └──bad signature──▶ PAYMENT_FAILED  (create-order may be retried)
```

| Status | Set by | Allows |
|---|---|---|
| `CREATED` | `assessment/start` | Creating a payment order |
| `PAYMENT_PENDING` | `payment/create-order` | Payment verification |
| `PAYMENT_FAILED` | `payment/verify` (invalid signature) | Retrying `create-order` |
| `QUESTIONS_UNLOCKED` | `payment/verify` (valid signature) | Fetching questions, submitting |
| `COMPLETED` | `submit` | Viewing the report; re-submits return the existing `reportId` |

`Payment.status` moves `CREATED → SUCCESS` or `CREATED → FAILED`. Amounts are stored in **paise** (`9900` = ₹99) and converted to rupees only at display/export time.

---

## Scoring & interpretation

### Instrument

- 50 items, exactly **10 per trait**: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism.
- 5-point Likert scale: 1 = Strongly Disagree … 5 = Strongly Agree.
- Every trait contains at least one reverse-keyed item (`reverseScored: true`).

### Engine (`src/lib/scoring/engine.ts`)

1. Validate that every one of the 50 questions has an integer answer from 1 to 5 (missing or invalid answers throw).
2. Reverse-keyed items are flipped: `6 − answer`.
3. Sum the 10 items for each trait (range 10–50).
4. Normalise to 0–100: `(sum − 10) / (50 − 10) × 100`.
5. Round to one decimal.

Because each trait has 10 integer items, scores move in **2.5-point steps** (41 possible values per trait). The engine is pure and deterministic: the same answers always give the same scores, regardless of response order.

### Interpretation (`src/lib/scoring/interpret.ts`)

| Level | Score |
|---|---|
| Low | 0 – 39 |
| Moderate | 40 – 69 |
| High | 70 – 100 |

(The 2.5-point granularity means no score can fall between 39 and 40 or between 69 and 70, so the legend and thresholds never disagree.)

From the five levels the interpreter builds a `ReportData` object containing: methodology and limitations, trait ranking, primary/secondary strengths (traits ≥ 70), balanced dimensions (40–69), development focus (< 40), a named personality-type summary (e.g. "The Thoughtful Strategist"), per-trait meaning and implications, strengths, leadership, communication, decision-making, career fit, learning style, stress and coping, motivational drivers, development areas, an action plan and a disclaimer. All text is selected from fixed dictionaries — no AI generation.

### Response-quality flags

`deriveResponseQuality()` checks each answer set and marks it invalid if any of these apply:

| Flag | Rule |
|---|---|
| Straight-lining | Standard deviation of answers < 0.5 |
| Extreme responding | More than 80% of answers are 1 or 5 |
| Neutral responding | More than 80% of answers are 3 |

Flags are included in the report and summarised on the admin **User Input Analysis** page.

---

## API reference

All endpoints accept and return JSON unless noted. Input is validated with Zod; validation failures return `400` with `{ error, details }`.

### Participant flow

#### `POST /api/assessment/start`
Creates a participant and an assessment.

```json
// request
{ "name": "Asha Rao", "email": "asha@example.com", "phone": "+91 98765 43210" }
// 200
{ "assessmentId": "3f1c…-uuid" }
```
Rules: name 2–100 chars; valid email (lower-cased); phone matches `^\+?[0-9\s\-()]{7,20}$`.
Errors: `400` invalid input · `500` database failure.

#### `POST /api/payment/create-order`
Creates a Razorpay order for ₹99 and moves the assessment to `PAYMENT_PENDING`.

```json
// request
{ "assessmentId": "3f1c…-uuid" }
// 200
{ "orderId": "order_Nx…", "amount": 9900, "currency": "INR" }
```
Errors: `400` bad UUID · `404` unknown assessment · `409` already paid · `500` Razorpay/DB failure.

#### `POST /api/payment/verify`
Verifies the Checkout signature server-side and unlocks the questions.

```json
// request
{
  "assessmentId": "3f1c…-uuid",
  "razorpayOrderId": "order_Nx…",
  "razorpayPaymentId": "pay_Nx…",
  "razorpaySignature": "hex…"
}
// 200
{ "assessmentId": "3f1c…-uuid" }
```
Idempotent: returns `200` if the payment is already `SUCCESS`.
Errors: `400` invalid input, order ID mismatch, or invalid signature (marks payment `FAILED`) · `404` no payment record · `500`.

#### `GET /api/assessment/{token}/questions`
`token` is the `assessmentId`. Returns the 50 questions **only** when status is `QUESTIONS_UNLOCKED`.

```json
{ "questions": [ { "id": "q1", "text": "…", "order": 1 }, … ] }
```
Errors: `404` not found · `403` not unlocked.

#### `POST /api/assessment/{token}/submit`
Scores the answers, stores responses/result/report, marks the assessment `COMPLETED`, and queues the email.

```json
// request — exactly 50 entries, answers are integers 1–5
{ "responses": [ { "questionId": "q1", "answer": 4 }, … ] }
// 200
{ "reportId": "clx…" }
// 200 on repeat submission
{ "reportId": "clx…", "alreadySubmitted": true }
```
Errors: `400` wrong count, bad answer, or unknown question ID · `403` not unlocked · `404` not found.

#### `GET /api/report/{id}`
Returns `{ content, assessmentId, createdAt }` for a report. `Cache-Control: private, no-store`. `404` if missing.

#### `GET /api/report/{id}/pdf`
Streams the report as `application/pdf` with `Content-Disposition: attachment; filename="psychometric-report-<name>.pdf"`. Runs on the Node.js runtime.

### Admin (require a valid `admin_session` cookie, except login/logout)

| Method & path | Purpose | Notes |
|---|---|---|
| `POST /api/admin/login` | `{ email, password }` → sets session cookie | `401` wrong credentials · `429` after 10 failures per IP in 15 min · `500` if admin env vars missing |
| `POST /api/admin/logout` | Clears the session cookie | Always `200` |
| `GET /api/admin/evidence/export` | Downloads `psychometric-pro-evidence.csv` | One row per participant: status, Razorpay order/payment IDs, amount (₹), report ID |
| `GET /api/admin/reset` | Current record counts per table | Used by the reset preview |
| `DELETE /api/admin/reset` | Deletes **all** participant data | Needs `ALLOW_DATA_RESET=true` **and** body `{ "confirmation": "DELETE ALL TEST DATA" }`; `403` if disabled |

Reset deletes in foreign-key-safe order: Response → Report → Result → Payment → Assessment → Participant. Schema and migrations are kept.

---

## Data model

```mermaid
erDiagram
    Participant ||--o{ Assessment : takes
    Participant ||--o{ Payment : makes
    Assessment ||--o{ Response : has
    Assessment ||--o| Payment : "paid by"
    Assessment ||--o| Result : produces
    Assessment ||--o| Report : produces
```

| Model | Key fields | Notes |
|---|---|---|
| `Participant` | `id` (cuid), `name`, `email`, `phone`, `createdAt` | Indexed on `email`. A new row is created per assessment start. |
| `Assessment` | `id` (**uuid**, also the participant's access token), `status`, `startedAt`, `completedAt` | |
| `Response` | `assessmentId`, `questionId`, `answer` (1–5) | Unique on `(assessmentId, questionId)` — prevents duplicate answers. |
| `Payment` | `razorpayOrderId` (unique), `razorpayPaymentId` (unique), `amount` (paise), `currency`, `status` | One payment per assessment. |
| `Result` | five `Float` trait scores (0–100) | One per assessment. |
| `Report` | `content` (`JSONB` `ReportData`) | One per assessment; its `id` is the public report link. |

**Why there are no transactions:** Prisma 7 driver adapters don't support interactive `$transaction` (error P2028). Multi-step writes are sequential and made safe by idempotency — unique constraints stop duplicates, and each route checks the current status before acting, so a partially failed request can simply be retried.

---

## Admin console

Sign in at `/admin/login` with `ADMIN_EMAIL` and the password behind `ADMIN_PASSWORD_HASH`. Sessions last 24 hours.

| Page | What you get |
|---|---|
| **Overview** `/admin` | Totals, paid assessments, completion rate, revenue |
| **Participants** `/admin/participants` | Paginated list; detail view with payment details and a timeline (started → paid → submitted → scored → report) |
| **Payments** `/admin/payments` | Razorpay transaction log |
| **Reports** `/admin/reports` | Every generated report with View and PDF links |
| **User Input Analysis** `/admin/responses` | Answer distribution, per-question stats, response-quality flags, filter by trait |
| **Evidence / Reset** `/admin/evidence` | Revenue computed from actual DB values, CSV export, and the guarded data reset |

**Resetting test data before launch**
1. Set `ALLOW_DATA_RESET=true` and redeploy.
2. Open Evidence / Reset → *Begin Reset…* → type `DELETE ALL TEST DATA` → confirm.
3. Set `ALLOW_DATA_RESET=false` and redeploy again.

---

## Security

- **Payments:** the signature `HMAC_SHA256(order_id|payment_id, RAZORPAY_KEY_SECRET)` is recomputed on the server and compared in constant time (with a length check first so malformed input can't crash it). The order ID must also match the one stored for that assessment. The frontend's success callback is never trusted on its own.
- **Price is server-side:** the amount (`ASSESSMENT_PRICE_PAISE`) is set in `src/lib/razorpay.ts`, not sent by the client.
- **Admin auth:** bcrypt password check; session token is `admin.<issuedAt>.<hmac>` signed with `ADMIN_SESSION_SECRET`, stored in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production), and expiry is re-checked on the server. A missing secret makes verification fail closed.
- **Route protection:** `src/proxy.ts` redirects unauthenticated `/admin/*` requests to the login page and returns `401` for `/api/admin/*` (except login and logout). The reset route checks the session again itself.
- **Brute-force protection:** in-memory limit of 10 failed logins per IP per 15 minutes.
- **Scoring integrity:** trait mapping and reverse flags never leave the server.
- **Input validation:** Zod schemas on every public write endpoint.
- **Access model for participants:** there are no participant accounts. Questions are reached via the assessment UUID, and reports via the report ID. Anyone holding a report link can view and download that report, so treat links as confidential.

---

## Testing

```bash
npm test                 # Jest unit tests
npx tsc --noEmit         # Type check
npm run build            # Confirms all routes compile
```

Unit suites in `src/__tests__/` cover:

- **Scoring engine** — 50 questions / 10 per trait, all-3s = 50, floor = 0, ceiling = 100, the `score(all 1s) + score(all 5s) = 100` complement, rejection of invalid/missing answers, determinism, order independence, 2.5-point granularity, and that `getQuestionTexts()` leaks no scoring metadata or mutates shared state.
- **Razorpay signatures** — valid, tampered, truncated, empty, oversized, non-hex, and wrong order/payment IDs.
- **Admin metrics** and **response-quality** checks.

**End-to-end API check** (against a running dev server with test Razorpay keys):

```bash
npm run dev
node scripts/e2e-api.mjs
```
It starts an assessment, creates an order, signs a fake payment with your `RAZORPAY_KEY_SECRET`, fetches questions, submits random answers and requests the report. Use a test database — it writes real rows.

---

## Deployment

1. Create a managed Postgres database (Neon, Supabase, etc.) and copy its connection string.
2. Import the repo into Vercel.
3. Add every variable from [Environment variables](#environment-variables) in Vercel → Settings → Environment Variables. Set `NEXT_PUBLIC_BASE_URL` to the production URL and use Razorpay **live** keys for production.
4. Apply migrations against the production DB:
   ```bash
   DATABASE_URL="<prod url>" npx prisma migrate deploy
   ```
5. Deploy. `npm install` runs `prisma generate` automatically.
6. Smoke-test: complete one paid flow, open the report, download the PDF, sign in to `/admin`.
7. If you used the live site for testing, clear the data (see *Resetting test data*) and set `ALLOW_DATA_RESET=false`.

**Email in production:** the sender is currently `onboarding@resend.dev`, Resend's shared test address, which only delivers to your own Resend account email. Verify your domain in Resend and change the `from` address in `src/lib/email.ts` before launch.

---

## Known limitations

- **No Razorpay webhook.** Unlocking depends on the browser calling `/api/payment/verify`. If the user closes the tab after paying but before verification, the payment is captured but the assessment stays `PAYMENT_PENDING`. Adding a `payment.captured` webhook would close this gap.
- **Login rate limit is per instance and in memory**, so it resets on cold starts and isn't shared across serverless instances. Use Upstash Redis / Vercel KV for a durable limit.
- **Report links are bearer links** with no expiry or revocation.
- **Single admin** defined by environment variables; no roles or audit log.
- **Currency is fixed** to INR; price is a code constant.
- **PDF generation is CPU-heavy**; on low-tier serverless plans very slow renders can hit function timeouts.
- **No normative data** — scores are relative to the scale, not to a population.
- **English only.**

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `DATABASE_URL environment variable is not set` | Missing from `.env.local` or the Vercel project. |
| `Missing Razorpay environment variables` at build/start | Set **both** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (the public `NEXT_PUBLIC_…` key alone isn't enough). |
| Checkout modal doesn't open | `NEXT_PUBLIC_RAZORPAY_KEY_ID` missing, or the change wasn't redeployed (public vars are baked in at build time). |
| "Invalid payment signature" | Key ID and secret belong to different Razorpay accounts or modes (test vs live). |
| Admin login returns 500 | `ADMIN_EMAIL` or `ADMIN_PASSWORD_HASH` not set. |
| Admin login keeps redirecting back | `ADMIN_SESSION_SECRET` missing, or it changed after login (old cookies become invalid). |
| Admin login returns 429 | 10 failed attempts from your IP; wait 15 minutes. |
| No email arrives | `RESEND_API_KEY` unset (check logs for `[email]`), or the Resend sender domain isn't verified. |
| Email link points to `/report/...` without a domain | Set `NEXT_PUBLIC_BASE_URL`. |
| Reset button shows "Reset Disabled" | Set `ALLOW_DATA_RESET=true` and redeploy. |
| Tables missing | Run `npx prisma migrate dev` (local) or `npx prisma migrate deploy` (prod); check with `scripts/db-check.mjs`. |
