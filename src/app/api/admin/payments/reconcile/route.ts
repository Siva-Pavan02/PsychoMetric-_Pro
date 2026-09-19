/**
 * POST /api/admin/payments/reconcile
 *
 * Admin-only: trigger Razorpay reconciliation for a specific assessment.
 * Guarded by proxy.ts and re-checks session inside the handler.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { reconcileAssessment } from "@/lib/payments/reconcile";

const schema = z.object({ assessmentId: z.string().uuid() });

export async function POST(req: NextRequest) {
  // Re-check session inside handler (proxy only does edge signature check)
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token || !(await verifySession(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const status = await reconcileAssessment(parsed.data.assessmentId);
    return NextResponse.json({ status });
  } catch (err) {
    console.error("[admin/payments/reconcile]", err);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
