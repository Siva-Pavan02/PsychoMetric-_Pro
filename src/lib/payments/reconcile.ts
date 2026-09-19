/**
 * Assessment reconciliation against Razorpay.
 *
 * Checks the Razorpay order for captured payments and unlocks the assessment
 * if found. Used as a safety net when the browser never called /verify.
 */

import { db } from "@/lib/db";
import { razorpay } from "@/lib/razorpay";
import { markPaymentSucceeded } from "./unlock";

type RazorpayPaymentItem = { status: string; id: string };

/**
 * Reconcile a single assessment against Razorpay.
 * Safe to call repeatedly — markPaymentSucceeded is idempotent.
 * Returns the final payment status.
 */
export async function reconcileAssessment(assessmentId: string): Promise<string> {
  const payment = await db.payment.findUnique({
    where: { assessmentId },
    select: { status: true, razorpayOrderId: true, razorpayPaymentId: true },
  });

  if (!payment) return "NONE";

  // Already resolved — no need to hit Razorpay
  if (payment.status === "SUCCESS" || payment.status === "FAILED") {
    return payment.status;
  }

  // Only reconcile CREATED or PENDING payments
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Razorpay SDK missing typedefs
    const orderPayments = await (razorpay.orders as any).fetchPayments(payment.razorpayOrderId);
    const items: RazorpayPaymentItem[] = (orderPayments?.items as RazorpayPaymentItem[]) ?? [];

    const captured = items.find((p) => p.status === "captured");
    if (captured) {
      await markPaymentSucceeded({
        assessmentId,
        razorpayOrderId:   payment.razorpayOrderId,
        razorpayPaymentId: captured.id,
        source:            "reconcile",
      });
      return "SUCCESS";
    }

    const failed = items.find((p) => p.status === "failed");
    if (failed) {
      // Don't call markPaymentFailed here — a captured payment may coexist with
      // an earlier failed attempt on the same order. Only fail if no capture found.
      return "FAILED";
    }
  } catch (err) {
    console.error("[reconcile] Razorpay fetch failed for order", payment.razorpayOrderId, err);
  }

  return payment.status;
}
