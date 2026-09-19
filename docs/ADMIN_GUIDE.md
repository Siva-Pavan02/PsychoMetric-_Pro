# Admin guide

**Audience:** admin

This guide explains the admin console at `https://<YOUR_DOMAIN>/admin`: what each page shows, what each button does, and how to handle common requests. Actions marked **Irreversible** cannot be undone from the console.

## Contents

- [Signing in and out](#signing-in-and-out)
- [Pages](#pages)
- [Report access panel](#report-access-panel)
- [Procedures](#procedures)
- [Audit log](#audit-log)

## Signing in and out

- Sign in at `/admin/login` with the admin email and password. There is one admin account, set by the operator.
- A session lasts 24 hours. After that you are sent back to the sign-in page.
- The sign-in page shows "Invalid email or password" for every failure. That includes being locked out after 10 attempts in 15 minutes and a server configuration problem. If a correct password is refused, wait 15 minutes and try again, then contact the operator.
- **Logout** is at the bottom of the sidebar (top right on a phone). It signs out this browser only.

## Pages

### Overview

The dashboard. All figures are live.

| Item | Meaning |
|---|---|
| Participants | Every registration, paid or not |
| Completed | Assessments that were submitted |
| Pending | Assessments not yet submitted, including unpaid ones |
| Successful payments, Failed payments | Payments in each state |
| Total revenue | Sum of successful payments. Refunds made in Razorpay are **not** subtracted. |
| Avg successful payment | Total revenue divided by successful payments |
| Pending / created | Payments started but not confirmed |
| Recent activity | The 5 newest participants and how far each got |

### Participants

Every participant, newest first, 20 per page. Payment and Assessment show each participant's latest status. Amount appears only for successful payments. **View** opens the participant.

**Cleanup Orphans** (top right). **Irreversible.** Deletes participants who registered more than 7 days ago and never paid, together with their unpaid assessments. It asks for confirmation, then reports how many were deleted. It never deletes anyone with a successful or pending payment.

### Participant detail

One participant's full record.

| Section | Shows |
|---|---|
| Participant Details | Name, email, phone, registration date |
| Payment Details | Status, amount, how it was confirmed (client verify, webhook or reconcile), Razorpay order and payment IDs |
| Re-check with Razorpay | Shown for unpaid payments. **This button does not currently work:** it always shows an "Invalid input" error. See [Recover a stuck payment](#recover-a-stuck-payment). |
| Assessment Status | Status, start and completion dates |
| Personality Result | The five trait scores, once submitted |
| Report | Whether a report exists, whether its PDF is cached, when the report email was last sent |
| Event Timeline | Started, paid, submitted, scored and report generated, with dates |

In the Report section:

- **Download PDF** always works for you, because your admin session is accepted instead of the participant's link.
- **View Online Report** opens the report page without the participant's link token. For any report that has a token it shows "not found". Use **Download PDF** to read the report.
- The [report access panel](#report-access-panel) sits below these buttons.

### Payments

Successful payments only, newest first, 20 per page. The Date column is when the order was created. Payment Method always says "Not available", because the app does not record it.

### Reports

Every report, newest first, 20 per page. The Status, PDF and Email Status columns are fixed labels ("Generated", "Available", "Not tracked"), not live data. For the real email status, open the participant. **PDF** downloads the report. **View** has the same limitation as **View Online Report** above.

### User Input Analysis

Statistics on how participants answered, using completed assessments only. Answers are shown as given, before any scoring.

| Item | Meaning |
|---|---|
| Total Participants, Started, Completed | Counts; completion rate is completed divided by started |
| Valid Response Sets | Completed assessments with no quality flag |
| Response Summary | Share of all answers at each point of the scale |
| Response Quality | Valid and flagged sets; flagged sets split into straight-lined, extreme-heavy and neutral-heavy. One set can appear under more than one heading. The rules are in [SCORING.md](SCORING.md#response-quality-flags). |
| Question Analysis | Click a question to see its answer distribution, most common answer, and agreement (4 and 5), neutral (3) and disagreement (1 and 2) rates. Use **Filter** and **Apply** to show one trait. Questions nobody has answered are hidden. |
| Top Response Patterns | The questions with the highest agreement, highest disagreement and most neutral answers, across all traits regardless of the filter |

### Evidence / Reset

Titled "CA Evidence". It shows project parameters (model, number of questions, price, gateway), live counts, revenue with its formula, and two actions:

- **Export CSV** downloads one row per participant. See [Export the CSV](#export-the-csv).
- **Reset Test Data**. **Irreversible.** See [Reset test data](#reset-test-data).

### Audit Log

The latest 100 admin actions. See [Audit log](#audit-log).

## Report access panel

Found on the participant detail page, under **Report**. A participant opens their report with a report link of the form `https://<YOUR_DOMAIN>/report/<REPORT_ID>?t=<TOKEN>`.

**Token Status:**

| Status | Meaning |
|---|---|
| ACTIVE | The participant's link works until the Expires date |
| EXPIRED | The link has passed its expiry date |
| REVOKED | You revoked the link |
| NONE | An old report created before links had tokens. It opens with the report ID alone unless the operator has turned that off. |

**Buttons:**

| Button | Shown | Asks to confirm | What it does |
|---|---|---|---|
| Resend Email | Always | No | Creates a new link and emails it to the participant. **The previous link stops working.** |
| Regen PDF | Always | No | Rebuilds the PDF now and stores it |
| Clear PDF Cache | When a PDF is cached | No | Deletes the stored PDF. The next download rebuilds it. Harmless. |
| Revoke Access | Link active and not revoked | Yes | The participant's link and PDF stop working. **The old link can never be restored**; only a new one can be issued. |
| Extend 30 Days | Link exists and not revoked | No | Adds 30 days to the expiry date, or to today if it has already expired |
| Issue Token / Re-issue Token | Always | Yes | Creates a new link, clears any revocation and sets a fresh expiry. **The previous link stops working.** The new token is shown once only. |

After **Issue Token**, the token appears in a green box. Copy it immediately; it cannot be shown again. The full link is `https://<YOUR_DOMAIN>/report/<REPORT_ID>?t=<TOKEN>`. The report ID is the last part of the address that **View Online Report** opens. In most cases **Resend Email** is simpler, because it sends the link for you.

## Procedures

### Verify a participant's payment

1. Open **Participants** and click **View** on the participant.
2. In **Payment Details**, check that Status is `SUCCESS` and note the Razorpay Payment ID.
3. To confirm with Razorpay, search that payment ID in the Razorpay Dashboard under **Transactions → Payments**. It should show **Captured** for the same amount.

### Recover a stuck payment

Symptom: the participant says they paid, but the participant page shows a status other than `SUCCESS`, or they cannot open the questions.

1. Open the participant and copy the **Razorpay Order ID**.
2. In the Razorpay Dashboard, search **Transactions → Orders** for that order. If none of its payments is **Captured**, the participant has not paid. Ask them to try again from `/assessment`.
3. If a payment is **Captured**, ask the participant to open `https://<YOUR_DOMAIN>/assessment/resume` and enter the email they registered with. This re-checks the payment with Razorpay and emails them a link to the questions.
4. If the payment status shows `SUCCESS` but the participant still cannot open the questions, or the recovery email does not help, pass it to the operator with the participant's email and the order ID. The operator follows [RUNBOOK.md](RUNBOOK.md).

Do not rely on **Re-check with Razorpay**; it does not currently work.

### Resend a report email

1. Open the participant.
2. Under **Report**, click **Resend Email**. The message "Email queued for resending." appears.
3. Refresh the page after a minute. **Email Sent** shows today's date if it was delivered to Resend.

The participant's previous link stops working. Tell them to use the newest email.

### Revoke, reissue or extend a report link

- **Stop access** (for example after a refund): click **Revoke Access** and confirm.
- **Give a new link**: click **Resend Email**. Use **Issue Token** only if you need to send the link yourself.
- **Restore access after revoking**: click **Resend Email** or **Issue Token**. Both clear the revocation with a new link.
- **Extend**: click **Extend 30 Days**. Click it again for more.

### Clear or regenerate a PDF

- If a participant reports a wrong or broken PDF, click **Regen PDF**, then **Download PDF** to check it.
- **Clear PDF Cache** is only needed if you want the next download to rebuild the PDF. It changes nothing else.

### Export the CSV

1. Open **Evidence / Reset** and click **Export CSV**.
2. The file `psychometric-pro-evidence.csv` downloads. Columns are listed in [API.md](API.md#get-apiadminevidenceexport).

The file contains names, emails and payment IDs. Store it securely and delete it when finished. If you open it in a spreadsheet, a name beginning with `=`, `+`, `-` or `@` may be treated as a formula; import it as text if in doubt.

### Clean up orphaned records

**Irreversible.**

1. Open **Participants** and click **Cleanup Orphans**.
2. Read the confirmation and click **OK**.
3. A message states how many participants were deleted.

The exact rule for what is deleted is in [DATABASE.md](DATABASE.md#orphan-cleanup).

### Reset test data

**Irreversible.** Deletes every participant, assessment, answer, result, report, cached PDF and payment, including real successful payments. The audit log, email log and webhook records are kept.

The operator must first set `ALLOW_DATA_RESET=true`. Otherwise the page shows "Reset Disabled".

1. Ask the operator for a database backup.
2. Open **Evidence / Reset**. Check the record counts.
3. Click **Begin Reset…**.
4. Type `DELETE ALL TEST DATA` exactly and click **Continue →**.
5. Check the final confirmation and click **DELETE PERMANENTLY**.
6. "Reset Complete" shows the new counts, which should all be 0.
7. Ask the operator to set `ALLOW_DATA_RESET=false`.

The reset does not appear in the audit log.

### Read the User Input Analysis page

See [User Input Analysis](#user-input-analysis) above for each figure. A high number of flagged sets suggests participants clicked through without reading. The flags never change anyone's scores.

## Audit log

The **Audit Log** page lists the latest 100 entries, newest first. The Time column shows the date only. Details shows the data recorded with each entry.

| Action | Recorded when | Details |
|---|---|---|
| `ADMIN_LOGIN` | Successful sign-in | `ip` |
| `DELETE_ORPHANS` | Cleanup Orphans deleted at least one participant | `count`, `orphanIds` |
| `REVOKE_REPORT_TOKEN` | Revoke Access | `reportId` |
| `ISSUE_REPORT_TOKEN` | Issue Token or Re-issue Token | `reportId` |
| `EXTEND_REPORT_TOKEN` | Extend 30 Days | `reportId`, `addDays`, `newExpiry` |
| `RESEND_REPORT_EMAIL` | Resend Email | `reportId` |
| `REGEN_PDF` | Regen PDF | `reportId` |
| `CLEAR_PDF_CACHE` | Clear PDF Cache | `reportId` |

Not recorded: sign-out, **Reset Test Data**, **Re-check with Razorpay**, **Export CSV** and failed sign-ins. Because there is one shared admin account, entries do not say who acted.
