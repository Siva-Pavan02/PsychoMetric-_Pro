import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendReportEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/audit";
import { reissueReportToken } from "@/lib/report-token";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const report = await db.report.findUnique({
      where: { id },
      include: {
        assessment: {
          include: {
            participant: true,
          }
        }
      }
    });

    if (!report || !report.assessment) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const reportUrl = `${baseUrl}/report/${report.id}?t=${await reissueReportToken(report.id)}`;

    sendReportEmail(
      report.assessment.participant.email,
      report.assessment.participant.name,
      reportUrl,
      report.assessmentId
    );

    logAdminAction("RESEND_REPORT_EMAIL", { reportId: report.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[resend-email]", err);
    return NextResponse.json({ error: "Failed to resend email" }, { status: 500 });
  }
}
