import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const count = await db.participant.count({
      where: {
        createdAt: { lt: sevenDaysAgo },
        NOT: {
          OR: [
            { assessments: { some: { status: { notIn: ["CREATED", "PAYMENT_FAILED"] } } } },
            { payments: { some: { status: { notIn: ["FAILED"] } } } },
          ],
        },
      },
    });

    return NextResponse.json({ totalOrphans: count });
  } catch (err) {
    console.error("[cleanup-orphans-preview]", err);
    return NextResponse.json({ error: "Failed to count orphans" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const orphans = await db.participant.findMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
        NOT: {
          OR: [
            { assessments: { some: { status: { notIn: ["CREATED", "PAYMENT_FAILED"] } } } },
            { payments: { some: { status: { notIn: ["FAILED"] } } } },
          ],
        },
      },
      select: { id: true },
    });

    const orphanIds = orphans.map((o) => o.id);

    if (orphanIds.length > 0) {
      for (const pId of orphanIds) {
        const assessments = await db.assessment.findMany({ where: { participantId: pId }, select: { id: true } });
        const assessmentIds = assessments.map(a => a.id);

        if (assessmentIds.length > 0) {
          await db.payment.deleteMany({ where: { assessmentId: { in: assessmentIds }, status: "FAILED" } });
          await db.response.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
          await db.result.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
          
          const reports = await db.report.findMany({ where: { assessmentId: { in: assessmentIds } }, select: { id: true } });
          if (reports.length > 0) {
            const reportIds = reports.map(r => r.id);
            await db.reportPdf.deleteMany({ where: { reportId: { in: reportIds } } });
            await db.report.deleteMany({ where: { id: { in: reportIds } } });
          }
          await db.assessment.deleteMany({ where: { id: { in: assessmentIds } } });
        }
      }

      const deletedCount = await db.participant.deleteMany({
        where: { id: { in: orphanIds } },
      });

      logAdminAction("DELETE_ORPHANS", { count: deletedCount.count, orphanIds });
      
      return NextResponse.json({ success: true, deleted: deletedCount.count });
    }

    return NextResponse.json({ success: true, deleted: 0 });
  } catch (err) {
    console.error("[cleanup-orphans]", err);
    return NextResponse.json({ error: "Failed to cleanup orphans" }, { status: 500 });
  }
}
