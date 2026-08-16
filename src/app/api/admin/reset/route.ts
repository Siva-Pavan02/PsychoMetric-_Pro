import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONFIRMATION_PHRASE = "DELETE ALL TEST DATA";

/** GET — return current record counts (for pre-reset preview). */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const counts = await getRecordCounts();
  return NextResponse.json({ counts });
}

/**
 * DELETE — execute ordered data reset.
 *
 * Security gates:
 *   1. Valid admin session cookie
 *   2. ALLOW_DATA_RESET === "true" environment variable
 *   3. Typed confirmation phrase in request body
 *
 * Deletion order (FK-safe):
 *   Response → Report → Result → Payment → Assessment → Participant
 *
 * NOTE: Prisma 7 + PostgreSQL adapter does not guarantee full $transaction
 * semantics in all deployment modes. Deletion is sequential and idempotent —
 * a partial failure is safely retryable by re-executing the reset.
 * No false atomicity is claimed.
 */
export async function DELETE(req: NextRequest) {
  // 1. Auth gate
  const session = await getAdminSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // 2. Env var gate
  if (process.env.ALLOW_DATA_RESET !== "true") {
    return NextResponse.json(
      { error: "Reset is disabled. Set ALLOW_DATA_RESET=true and redeploy." },
      { status: 403 }
    );
  }

  // 3. Typed confirmation gate
  let body: { confirmation?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.confirmation !== CONFIRMATION_PHRASE) {
    return NextResponse.json(
      { error: "Confirmation phrase did not match." },
      { status: 400 }
    );
  }

  // Snapshot counts before deletion
  const before = await getRecordCounts();

  // Audit log — no PII, no credentials
  console.log("[admin/reset] RESET INITIATED", {
    timestamp: new Date().toISOString(),
    admin: "authenticated_admin",
    before,
  });

  // Sequential FK-safe deletion
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  const steps: Array<{ name: string; fn: () => Promise<{ count: number }> }> = [
    { name: "responses", fn: () => db.response.deleteMany() },
    { name: "reports", fn: () => db.report.deleteMany() },
    { name: "results", fn: () => db.result.deleteMany() },
    { name: "payments", fn: () => db.payment.deleteMany() },
    { name: "assessments", fn: () => db.assessment.deleteMany() },
    { name: "participants", fn: () => db.participant.deleteMany() },
  ];

  for (const step of steps) {
    try {
      const result = await step.fn();
      deleted[step.name] = result.count;
    } catch (err) {
      const msg = `Failed to delete ${step.name}: ${String(err)}`;
      errors.push(msg);
      console.error("[admin/reset]", msg);
    }
  }

  const after = await getRecordCounts();

  const success = errors.length === 0;

  console.log("[admin/reset] RESET COMPLETE", {
    timestamp: new Date().toISOString(),
    success,
    deleted,
    errors,
    after,
  });

  if (!success) {
    return NextResponse.json(
      {
        error: "Partial failure. Some tables may not have been fully cleared.",
        errors,
        deleted,
        counts: after,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deleted, counts: after });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return false;
    return await verifySession(token);
  } catch {
    return false;
  }
}

async function getRecordCounts() {
  const [participants, assessments, responses, payments, results, reports] = await Promise.all([
    db.participant.count(),
    db.assessment.count(),
    db.response.count(),
    db.payment.count(),
    db.result.count(),
    db.report.count(),
  ]);
  return { participants, assessments, responses, payments, results, reports };
}
