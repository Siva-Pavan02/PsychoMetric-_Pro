/**
 * POST /api/payment/status
 *
 * Participant-facing endpoint to check payment status.
 * Runs reconciliation first when status is pending, so a closed-tab user
 * can poll until the webhook (or this endpoint) unlocks their assessment.
 *
 * Rate-limited: 10 requests per minute per IP (Postgres-backed, Phase 2).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reconcileAssessment } from "@/lib/payments/reconcile";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const schema = z.object({ assessmentId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const ip    = getClientIp(req);
  const limit = await rateLimit({ key: `payment-status:ip:${ip}`, limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { assessmentId } = parsed.data;

  try {
    // Reconcile first — may unlock a stuck assessment
    const status = await reconcileAssessment(assessmentId);

    const assessment = await db.assessment.findUnique({
      where:  { id: assessmentId },
      select: { status: true },
    });

    return NextResponse.json({
      paymentStatus:    status,
      assessmentStatus: assessment?.status ?? "NOT_FOUND",
    });
  } catch (err) {
    console.error("[payment/status]", err);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
