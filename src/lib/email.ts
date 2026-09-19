import { Resend } from "resend";
import { config } from "./config";
import { db } from "./db";
import { getReportEmailHtml } from "./email/templates";
import { after } from "next/server"; // Use after() from next/server

const resend = new Resend(config.RESEND_API_KEY);

/**
 * Enqueue an email to be sent after the response has been sent to the client.
 * Includes DB logging and basic retry logic.
 */
export function sendReportEmail(
  to: string,
  name: string,
  reportUrl: string,
  assessmentId?: string
): void {
  after(async () => {
    let emailLogId: string | null = null;
    try {
      const log = await db.emailLog.create({
        data: {
          recipient: to,
          subject: "Your Personality Assessment Report is Ready",
          status: "PENDING",
        },
      });
      emailLogId = log.id;
    } catch (err) {
      console.error("[email] Failed to create EmailLog:", err);
      // Proceed even if log creation fails
    }

    const html = getReportEmailHtml(name, reportUrl);

    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const { error } = await resend.emails.send({
          from: config.EMAIL_FROM,
          to,
          subject: "Your Personality Assessment Report is Ready",
          html,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Success
        if (emailLogId) {
          await db.emailLog.update({
            where: { id: emailLogId },
            data: { status: "SENT", sentAt: new Date() },
          });
        }
        
        if (assessmentId) {
          await db.report.update({
            where: { assessmentId },
            data: { emailSentAt: new Date() },
          });
        }

        console.log(`[email] Sent successfully to ${to} on attempt ${attempts}`);
        return; // Exit on success
      } catch (err: unknown) {
        lastError = err;
        console.warn(`[email] Attempt ${attempts} failed for ${to}:`, err instanceof Error ? err.message : String(err));
        if (attempts < maxAttempts) {
          await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempts))); // exp backoff
        }
      }
    }

    // Failed all attempts
    console.error(`[email] All ${maxAttempts} attempts failed for ${to}:`, lastError);
    if (emailLogId) {
      await db.emailLog.update({
        where: { id: emailLogId },
        data: { status: "FAILED", error: (lastError instanceof Error ? lastError.message : String(lastError)).slice(0, 255) },
      });
    }
  });
}

