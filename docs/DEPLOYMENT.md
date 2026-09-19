# Deployment

**Audience:** operator

The target is Vercel plus a managed PostgreSQL database such as Neon. Commands use bash syntax.

## Contents

- [First deployment](#first-deployment)
- [Updating a deployment](#updating-a-deployment)
- [Rolling back](#rolling-back)
- [Legacy report-link migration](#legacy-report-link-migration)
- [Pre-launch checklist](#pre-launch-checklist)

## First deployment

Each step ends with a check. Do not continue until the check passes.

### 1. Create the database

1. Create a PostgreSQL database with your provider. On Neon, copy both the **pooled** connection string (host contains `-pooler`) and the **direct** one.
2. Put them in a local `.env.local` as `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).

**Check:**

```bash
node --env-file=.env.local scripts/db-check.mjs
```

Expected: `Database connection OK`.

### 2. Set the environment variables

1. In Vercel, open **Project → Settings → Environment Variables**.
2. Add every required variable from [CONFIGURATION.md](CONFIGURATION.md) for the **Production** environment. Use **test** Razorpay keys for now.
3. Set `NEXT_PUBLIC_BASE_URL` to the production origin, for example `https://<YOUR_DOMAIN>`, with no trailing slash.
4. Set `ALLOW_DATA_RESET=true` for now. You will turn it off in step 10.

**Check:** the variable list in Vercel contains every name marked "Required" in CONFIGURATION.md, including `RAZORPAY_WEBHOOK_SECRET`, which is missing from `.env.example`.

### 3. Run the migrations

Vercel does not run migrations. Run them from your machine against the production database:

```bash
DATABASE_URL="<POOLED_URL>" DIRECT_URL="<DIRECT_URL>" npx prisma migrate deploy
```

**Check:**

```bash
DATABASE_URL="<POOLED_URL>" DIRECT_URL="<DIRECT_URL>" npx prisma migrate status
```

Expected: 8 migrations found and `Database schema is up to date!`.

### 4. Deploy

Push to the branch connected to Vercel, or run `vercel --prod`. The `postinstall` script runs `prisma generate` during the build.

**Check:** the build succeeds, and `https://<YOUR_DOMAIN>/` shows the landing page with the configured price. A 500 on the landing page usually means `RESEND_API_KEY` or `EMAIL_FROM` is missing.

### 5. Configure the Razorpay webhook

Follow [PAYMENTS.md](PAYMENTS.md#webhook) in **Test Mode**, with the URL `https://<YOUR_DOMAIN>/api/payment/webhook`. Redeploy if you changed `RAZORPAY_WEBHOOK_SECRET`.

**Check:** after the smoke test in step 7, this query shows rows with `processedAt` set and `error` empty:

```sql
SELECT event, "receivedAt", "processedAt", error
FROM "WebhookEvent" ORDER BY "receivedAt" DESC LIMIT 5;
```

### 6. Verify the sending domain in Resend

1. In Resend, open **Domains → Add Domain** and add the DNS records it shows at your DNS provider.
2. Wait until the domain shows **Verified**.
3. Set `EMAIL_FROM` to an address on that domain, for example `PsychoMetric Pro <reports@<YOUR_DOMAIN>>`, and redeploy.

**Check:** after the smoke test, the report email arrives and this query shows `SENT`:

```sql
SELECT recipient, status, error, "sentAt" FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 5;
```

### 7. Smoke test

Use your own email address and a Razorpay test card.

1. Open `/`, then **Start assessment**. Register.
2. Pay with a test card. You are sent to the questions.
3. Answer all 50 questions and submit. The report opens.
4. Click **Download PDF**. A PDF downloads.
5. Check your inbox for the report email and open its link.
6. Sign in at `/admin/login`. Your participant appears on the dashboard and the payment on **Payments**.
7. Repeat steps 1 and 2, but close the tab straight after paying. Within a minute the payment shows as `SUCCESS` in the admin console (confirmed by the webhook).

**Check:** every step behaves as described. If not, see [RUNBOOK.md](RUNBOOK.md).

### 8. Switch to live keys

1. In the Razorpay Dashboard, switch to **Live Mode** and generate live API keys.
2. Create a live-mode webhook as in step 5, with a new secret.
3. In Vercel, replace `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_WEBHOOK_SECRET` with the live values.
4. Redeploy. `NEXT_PUBLIC_RAZORPAY_KEY_ID` is fixed at build time, so a redeploy is required.

**Check:** make one real payment, confirm it reaches `SUCCESS` with a `WebhookEvent` row, then refund it in the Razorpay Dashboard if you wish. The refund does not change anything in the app (see [PAYMENTS.md](PAYMENTS.md#refunds)).

### 9. Clear the test data

**Irreversible.** This deletes every participant, assessment, payment and report, including the live payment from step 8.

1. Take a database backup or branch (see [DATABASE.md](DATABASE.md#backup-and-restore)).
2. In the admin console, open **Evidence / Reset** and follow [ADMIN_GUIDE.md](ADMIN_GUIDE.md#reset-test-data).

**Check:** the dashboard shows 0 participants and ₹0 revenue. The audit log, email log and webhook events are kept; the reset does not touch them.

### 10. Set the production flags

1. In Vercel set `ALLOW_DATA_RESET=false`.
2. Set `ALLOW_LEGACY_REPORT_LINKS=false`. A new deployment has no reports without tokens.
3. Redeploy.

**Check:** **Evidence / Reset** shows "Reset Disabled".

## Updating a deployment

1. See whether the change includes migrations:

   ```bash
   git diff --stat <DEPLOYED_COMMIT>..<NEW_COMMIT> -- prisma/migrations
   ```

2. If it does, back up the database first.
3. Apply migrations and deploy in the order that keeps the running code working:

   | Migration type | Order |
   |---|---|
   | Adds tables, columns or enum values | Run `npx prisma migrate deploy` (as in [step 3](#3-run-the-migrations)), then deploy the code |
   | Removes or renames something the running code uses | Deploy code that no longer uses it, then run the migration |

4. If you added or changed an environment variable, update Vercel before deploying.

### Report and PDF changes

- The report text is generated once, at submission, and stored in `Report.content`. Changing `src/lib/scoring/interpret.ts` affects new reports only.
- If you change the PDF layout in `src/lib/pdf/ReportDocument.tsx`, also change `PDF_TEMPLATE_VERSION` in the same file (for example from `"v1"` to `"v2"`). Every cached PDF then no longer matches and is re-rendered on its next download. No migration is needed.
- Deleting the cache outright is also safe: `DELETE FROM "ReportPdf";`

## Rolling back

1. In Vercel, open **Deployments**, pick the last good deployment, and choose **Promote to Production**. This takes effect in seconds.
2. Decide what to do about the database. Prisma has no down migrations.

   | Situation | Action |
   |---|---|
   | The new migration only added things | Leave the database as it is; the old code ignores the new columns and tables. |
   | The old code cannot work with the new schema | Restore the backup taken before the migration. Data written since then is lost. |
   | A migration failed partway | Fix the database by hand, then mark the migration with `npx prisma migrate resolve --rolled-back <MIGRATION_NAME>` (to retry it) or `--applied` (if you completed it by hand). |

3. If you rolled back past an environment variable change, restore the old value too.

## Legacy report-link migration

Reports created before report tokens existed have no `accessTokenHash`. They open with the report ID alone while `ALLOW_LEGACY_REPORT_LINKS` is not `false`. To close that gap:

1. List them:

   ```sql
   SELECT r.id, r."createdAt", p.name, p.email
   FROM "Report" r
   JOIN "Assessment" a ON a.id = r."assessmentId"
   JOIN "Participant" p ON p.id = a."participantId"
   WHERE r."accessTokenHash" IS NULL;
   ```

2. For each report, open the participant in the admin console and click **Resend Email**. This issues a token and emails the participant a working link. See [ADMIN_GUIDE.md](ADMIN_GUIDE.md#report-access-panel).
3. Run the query again until it returns no rows, or until you accept that the remaining links will stop working.
4. Set `ALLOW_LEGACY_REPORT_LINKS=false` and redeploy.

**Check:** `/report/<LEGACY_REPORT_ID>` with no `?t=` returns 404.

The script `scripts/find-legacy-report.ts` finds something different: reports in the old *content* format (no `methodology` field). Those still display, through `normalizeReport()`, and need no action.

## Pre-launch checklist

- [ ] All 8 migrations applied (`npx prisma migrate status`)
- [ ] Every required variable set in Vercel, including `RAZORPAY_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_BASE_URL` is the production origin with no trailing slash
- [ ] Live Razorpay keys in all three key variables, from the same key pair
- [ ] Live-mode webhook created with the three events; its secret matches `RAZORPAY_WEBHOOK_SECRET`
- [ ] Resend domain verified; `EMAIL_FROM` uses it
- [ ] `ADMIN_SESSION_SECRET` is new and unique to production
- [ ] Admin password is strong; its hash is pasted without quotes in Vercel
- [ ] Smoke test passed, including the close-the-tab test
- [ ] Test data cleared
- [ ] `ALLOW_DATA_RESET=false`
- [ ] `ALLOW_LEGACY_REPORT_LINKS=false`
- [ ] Database backups or point-in-time restore enabled at the provider
- [ ] Redeployed after the last variable change
