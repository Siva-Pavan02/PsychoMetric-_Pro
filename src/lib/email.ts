import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendReportEmail(
  to: string,
  name: string,
  reportUrl: string
): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email.");
    return;
  }

  try {
    await resend.emails.send({
      from:    "PsychoMetric Pro <onboarding@resend.dev>",
      to,
      subject: "Your Personality Assessment Report is Ready",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e3a5f;">Hello ${name},</h2>
          <p>Your PsychoMetric Pro personality assessment report is ready.</p>
          <p>
            <a href="${reportUrl}"
               style="display:inline-block;background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              View Your Report
            </a>
          </p>
          <p style="color:#666;font-size:13px;">
            You can also download a PDF version of your report directly from the report page.
            This link will remain active — please bookmark it for future reference.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:11px;">
            PsychoMetric Pro · This assessment is for educational and self-development purposes only.
          </p>
        </div>
      `,
    });
  } catch (err) {
    // Email failure never fails the assessment — log and continue.
    console.error("[email] Failed to send report email:", err);
  }
}
