import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { markPaymentSucceeded, markPaymentFailed } from "@/lib/payments/unlock";

const schema = z.object({
  assessmentId:      z.string().uuid(),
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { assessmentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    const existing = await db.payment.findUnique({
      where:  { assessmentId },
      select: { status: true, razorpayOrderId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }
    if (existing.status === "SUCCESS") {
      return NextResponse.json({ assessmentId }, { status: 200 }); // idempotent
    }
    if (existing.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Order ID mismatch" }, { status: 400 });
    }

    // Server-side signature verification — NEVER trust the frontend
    const valid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) {
      await markPaymentFailed(assessmentId);
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Shared unlock function — idempotent, sequential writes
    await markPaymentSucceeded({
      assessmentId,
      razorpayOrderId,
      razorpayPaymentId,
      source: "client_verify",
    });

    return NextResponse.json({ assessmentId });
  } catch (err) {
    console.error("[payment/verify]", err);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
