import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { razorpay, ASSESSMENT_PRICE_PAISE } from "@/lib/razorpay";

const schema = z.object({
  assessmentId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { assessmentId } = parsed.data;

    // Ensure assessment exists and is in a valid state for payment
    const assessment = await db.assessment.findUnique({
      where:  { id: assessmentId },
      select: { id: true, status: true, participantId: true, payment: { select: { status: true } } },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Idempotent: if payment already succeeded, return existing order
    if (assessment.payment?.status === "SUCCESS") {
      return NextResponse.json({ error: "Payment already completed" }, { status: 409 });
    }

    const order = await razorpay.orders.create({
      amount:   ASSESSMENT_PRICE_PAISE,
      currency: "INR",
      receipt:  assessmentId.slice(0, 40),
    });

    // Upsert payment record
    await db.payment.upsert({
      where:  { assessmentId },
      create: {
        participantId:   assessment.participantId,
        assessmentId,
        razorpayOrderId: order.id,
        amount:          ASSESSMENT_PRICE_PAISE,
        currency:        "INR",
        status:          "CREATED",
      },
      update: {
        razorpayOrderId: order.id,
        status:          "CREATED",
      },
    });

    await db.assessment.update({
      where: { id: assessmentId },
      data:  { status: "PAYMENT_PENDING" },
    });

    return NextResponse.json({ orderId: order.id, amount: ASSESSMENT_PRICE_PAISE, currency: "INR" });
  } catch (err) {
    console.error("[payment/create-order]", err);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
