# PsychoMetric Pro

PsychoMetric Pro is a paid web app for taking a Big Five (OCEAN) personality assessment. A participant registers with their name, email and phone, pays a one-time fee through Razorpay, and then answers 50 statements. They immediately receive a personalised report on the web, as a PDF and by email. The default price is ₹99 (9900 paise). An admin console covers participants, payments, reports, report link access and response statistics.

This is a self-awareness tool. **It is not a clinical or diagnostic assessment**, and its scores are not compared with population norms. See [docs/SCORING.md](docs/SCORING.md#limitations-and-disclaimer).

## Features

- 50-item Big Five questionnaire with reverse-keyed items and response-quality flags
- Deterministic scoring and rule-based report text: no AI, same answers give the same report
- Razorpay payments confirmed three ways: client verify, webhook and reconcile
- Self-service recovery page for participants who paid but lost their page
- Report links protected by expiring tokens that are hashed at rest and can be revoked
- PDF reports, cached by content hash
- Report emails through Resend, with retries and a delivery log
- Admin console with metrics, report access controls, CSV export and an audit log

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | PostgreSQL, Prisma 7 with `@prisma/adapter-pg` |
| Payments | Razorpay (Checkout, Orders API, webhooks) |
| Email | Resend |
| PDF | `@react-pdf/renderer` |
| Validation | Zod 4 |
| Styling | Tailwind CSS 4 |
| Tests | Jest 30 with ts-jest |
| Hosting | Vercel and a managed PostgreSQL such as Neon |

## Quick start

About 15 minutes, using Razorpay **test mode**, so no real money moves.

### Prerequisites

- Node.js 20.9 or later
- A PostgreSQL database: local, or a free Neon project
- A Razorpay account in Test Mode (API keys from **Account & Settings → API Keys**)
- Optional: a Resend API key and a verified sending domain, to receive the report email

### Steps

1. Install:

   ```bash
   git clone <REPOSITORY_URL>
   cd psychometric-pro
   npm install
   ```

   `npm install` also runs `prisma generate`.

2. Create `.env.local` from the template:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in `.env.local`. Every variable is explained in [docs/CONFIGURATION.md](docs/CONFIGURATION.md). For local development:

   ```dotenv
   DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>"
   DIRECT_URL="postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>"
   RAZORPAY_KEY_ID=rzp_test_<KEY_ID>
   RAZORPAY_KEY_SECRET=<KEY_SECRET>
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_<KEY_ID>
   RESEND_API_KEY=re_<KEY>
   EMAIL_FROM="PsychoMetric Pro <reports@<YOUR_VERIFIED_DOMAIN>>"
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ADMIN_EMAIL=<ADMIN_EMAIL>
   ADMIN_PASSWORD_HASH="\$2b\$12\$<REST_OF_HASH>"
   ADMIN_SESSION_SECRET=<RANDOM_HEX>
   ALLOW_DATA_RESET=true
   ```

   Generate the admin hash and session secret with the commands in [docs/CONFIGURATION.md](docs/CONFIGURATION.md#generating-secrets). Escape each `$` in the hash as shown. `RESEND_API_KEY` and `EMAIL_FROM` must be set even if you do not need email, or the app will not start. With an unverified domain, sends fail and are logged, but everything else works.

4. Check the database connection and apply the migrations:

   ```bash
   node --env-file=.env.local scripts/db-check.mjs
   npx prisma migrate deploy
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Make a test payment:
   1. Open `http://localhost:3000` and click **Start assessment**.
   2. Register, then pay in Razorpay Checkout with a test card or test UPI ID from Razorpay's test-mode documentation.
   3. Answer the 50 questions and submit. Your report opens.

7. Sign in to the admin console at `http://localhost:3000/admin/login` with `ADMIN_EMAIL` and the password you hashed.

### Receiving webhooks locally

You do not need webhooks to develop locally. With no webhook, payments are confirmed by client verify. If that fails, the checkout page polls `/api/payment/status`, which asks Razorpay directly (reconcile). A participant can also recover through `/assessment/resume`.

To test the webhook path, expose your local server through a tunnel:

1. Start a tunnel to port 3000 with either tool:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

   ```bash
   ngrok http 3000
   ```

2. In Razorpay **Test Mode**, add a webhook with the URL `https://<TUNNEL_HOST>/api/payment/webhook`, a secret, and the events `payment.captured`, `order.paid` and `payment.failed`. Full steps are in [docs/PAYMENTS.md](docs/PAYMENTS.md#webhook).
3. Add `RAZORPAY_WEBHOOK_SECRET=<SAME_SECRET>` to `.env.local` and restart `npm run dev`.
4. Pay, then close the tab before the redirect. The assessment still unlocks.

### Test data

There is no seed script. Create data by going through the flow above. `scripts/e2e-api.mjs` automates part of it; see [docs/TESTING.md](docs/TESTING.md#end-to-end-api-script). To start over, use **Reset Test Data** in the admin console (with `ALLOW_DATA_RESET=true`).

## npm scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Development server on port 3000 |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve a production build |
| `lint` | `eslint` | Lint with the Next.js config |
| `test` | `jest` | Unit tests |
| `postinstall` | `prisma generate` | Generate the Prisma client after every install |

Other scripts in `scripts/` are run by hand; see [docs/TESTING.md](docs/TESTING.md#scripts).

## Project structure

```text
psychometric-pro/
├── docs/                    Documentation (see below)
├── prisma/
│   ├── schema.prisma        Data model
│   └── migrations/          SQL migrations
├── prisma.config.ts         Prisma CLI config (DATABASE_URL or DIRECT_URL)
├── public/                  Static files
├── scratch/                 Ad-hoc debugging script
├── scripts/                 Hand-run scripts: DB check, end-to-end API test, report checks
├── src/
│   ├── __tests__/           Jest test suites
│   ├── app/
│   │   ├── admin/           Admin console pages
│   │   ├── api/             Route handlers (22)
│   │   ├── assessment/      Registration, payment, questions, recovery
│   │   ├── report/          Report page
│   │   ├── layout.tsx       Root layout
│   │   ├── page.tsx         Landing page
│   │   └── site-footer.tsx  Footer with contact form
│   ├── components/admin/    Client components for admin actions
│   ├── data/questions.ts    The 50 questions and their scoring keys
│   ├── lib/                 Server modules (see docs/ARCHITECTURE.md)
│   ├── types/               Shared TypeScript types
│   └── proxy.ts             Admin route guard
├── .env.example             Environment variable template
├── next.config.ts           Security headers
└── jest.config.ts           Test configuration
```

## Documentation

| Document | Contents | Audience |
|---|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System and sequence diagrams, pages, module map, design decisions, request lifecycle | Developer |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every environment variable, secret generation, recommended values | Developer, operator |
| [docs/API.md](docs/API.md) | Every endpoint, including the webhook: auth, limits, examples, errors, side effects | Developer |
| [docs/DATABASE.md](docs/DATABASE.md) | ER diagram, models, migrations, retention, backups | Developer |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Status machines, confirmation paths, Razorpay setup, refunds | Developer, operator |
| [docs/SCORING.md](docs/SCORING.md) | Formula, worked example, levels, quality flags, report building, disclaimer | Developer, admin |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, secret rotation, personal data, data deletion | Developer, operator |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | First deployment, updates, rollback, pre-launch checklist | Operator |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Every admin page and button, common procedures | Admin |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Symptoms, causes and fixes; log prefixes | Operator, admin |
| [docs/TESTING.md](docs/TESTING.md) | Checks, test suites, scripts, manual QA checklist | Developer |
