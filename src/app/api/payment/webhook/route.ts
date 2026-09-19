/**
 * POST /api/payment/webhook
 *
 * Receives Razorpay webhook events and updates payment/assessment state.
 * Public route (excluded from admin guard by proxy.ts — not under /api/admin/).
 *
 * Security: verifies X-Razorpay-Signature HMAC-SHA256 over the raw body
 * using RAZORPAY_WEBHOOK_SECRET. Constant-time compare with length check.
 *
 * Idempotency: WebhookEvent table deduplicates by x-razorpay-event-id.
 * If the event was already processed successfully, returns 200 immediately.
 * If processing fails after recording, stores the error and returns 500
 * so Razorpay retries.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { markPaymentSucceeded, markPaymentFailed } from "@/lib/payments/unlock";

export const runtime = "nodejs";

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] RAZORPAY_WEBHOOK_SECRET not set");
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const sigBuf      = Buffer.from(signature, "hex");

  // Length check before timingSafeEqual — prevents RangeError on attacker input
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

export async function POST(req: NextRequest) {
  // Must read raw body BEFORE any JSON parsing — Razorpay signs the raw bytes
  const rawBody  = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const eventId   = req.headers.get("x-razorpay-event-id") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Bad signature", { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const event = typeof payload.event === "string" ? payload.event : "unknown";

  // Idempotency: record this event; skip if already processed successfully
  let webhookRow: { processedAt: Date | null; error: string | null } | null = null;
  if (eventId) {
    try {
      // Create or find the event record
      webhookRow = await db.webhookEvent.upsert({
        where:  { eventId },
        create: { eventId, event, receivedAt: new Date() },
        update: {}, // Don't overwrite an existing record
        select: { processedAt: true, error: true },
      });
    } catch {
      // If upsert fails (race on unique), find and read the existing row
      webhookRow = await db.webhookEvent.findUnique({
        where:  { eventId },
        select: { processedAt: true, error: true },
      });
    }

    // Already processed successfully — acknowledge and skip
    if (webhookRow?.processedAt && !webhookRow.error) {
      return new NextResponse("OK", { status: 200 });
    }
  }

  // Safe deep-access helper for the opaque Razorpay webhook payload
  function getStr(obj: unknown, ...path: string[]): string | undefined {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur === null || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[key];
    }
    return typeof cur === "string" ? cur : undefined;
  }

  // Process the event
  try {
    if (event === "payment.captured" || event === "order.paid") {
      const orderId   = getStr(payload, "payload", "payment", "entity", "order_id")
                     ?? getStr(payload, "payload", "order",   "entity", "id");
      const paymentId = getStr(payload, "payload", "payment", "entity", "id");

      if (orderId) {
        const payment = await db.payment.findUnique({
          where:  { razorpayOrderId: orderId },
          select: { assessmentId: true, razorpayOrderId: true },
        });

        if (payment) {
          await markPaymentSucceeded({
            assessmentId:      payment.assessmentId,
            razorpayOrderId:   orderId,
            razorpayPaymentId: paymentId ?? `rzp_${Date.now()}`,
            source:            "webhook",
          });
        }
      }
    } else if (event === "payment.failed") {
      const orderId = getStr(payload, "payload", "payment", "entity", "order_id");
      if (orderId) {
        const payment = await db.payment.findUnique({
          where:  { razorpayOrderId: orderId },
          select: { assessmentId: true },
        });
        if (payment) {
          await markPaymentFailed(payment.assessmentId);
        }
      }
    }
    // All other events: acknowledge and ignore

    // Mark processed
    if (eventId) {
      await db.webhookEvent.update({
        where: { eventId },
        data:  { processedAt: new Date(), error: null },
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] Processing failed:", errMsg);

    // Store error so the row can be retried (processedAt stays null)
    if (eventId) {
      await db.webhookEvent.update({
        where: { eventId },
        data:  { error: errMsg },
      }).catch(() => {}); // best-effort
    }

    // Return 500 so Razorpay retries
    return new NextResponse("Processing error", { status: 500 });
  }
}
