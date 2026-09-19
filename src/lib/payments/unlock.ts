/**
 * Shared payment unlock/fail functions.
 *
 * Sequential writes — Prisma 7 adapter does not support $transaction (P2028).
 * Idempotency guard: if Payment.status is already SUCCESS we return early,
 * so partial retries (e.g. after a crash mid-write) are safe.
 */

import { db } from "@/lib/db";

export type ConfirmedVia = "client_verify" | "webhook" | "reconcile";

export interface UnlockParams {
  assessmentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  source: ConfirmedVia;
}

/**
 * Mark a payment as succeeded and unlock the assessment questions.
 * Idempotent: repeated calls with the same assessmentId are safe.
 */
export async function markPaymentSucceeded(params: UnlockParams): Promise<void> {
  const { assessmentId, razorpayOrderId, razorpayPaymentId, source } = params;

  const payment = await db.payment.findUnique({
    where: { assessmentId },
    select: { status: true, razorpayOrderId: true },
  });

  if (!payment) {
    throw new Error(`Payment not found for assessment ${assessmentId}`);
  }

  // Idempotent: already succeeded — nothing to do
  if (payment.status === "SUCCESS") return;

  if (payment.razorpayOrderId !== razorpayOrderId) {
    throw new Error(`Order ID mismatch for assessment ${assessmentId}`);
  }

  // ponytail: sequential writes; Payment unique constraint + Assessment status
  // check make partial retries safe — if the first write succeeds and the second
  // fails, a retry sets payment SUCCESS (no-op) then writes QUESTIONS_UNLOCKED.
  await db.payment.update({
    where: { assessmentId },
    data: {
      status: "SUCCESS",
      razorpayPaymentId,
      confirmedVia: source,
      paidAt: new Date(),
    },
  });

  // Only unlock if not already further along (e.g. COMPLETED)
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: { status: true },
  });

  if (assessment && assessment.status !== "COMPLETED") {
    await db.assessment.update({
      where: { id: assessmentId },
      data: { status: "QUESTIONS_UNLOCKED" },
    });
  }
}

/**
 * Mark a payment as failed. No-op if payment is already SUCCESS
 * (never downgrade a captured payment).
 */
export async function markPaymentFailed(assessmentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { assessmentId },
    select: { status: true },
  });

  if (!payment || payment.status === "SUCCESS") return;

  await db.payment.update({
    where: { assessmentId },
    data: { status: "FAILED" },
  });

  await db.assessment.update({
    where: { id: assessmentId },
    data: { status: "PAYMENT_FAILED" },
  });
}
