import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkReportAccess } from "@/lib/report-token";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("t");

  const report = await db.report.findUnique({
    where:  { id },
    select: {
      content:              true,
      assessmentId:         true,
      createdAt:            true,
      accessTokenHash:      true,
      expiresAt:            true,
      revokedAt:            true,
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const access = checkReportAccess(report, token);
  if (access !== "ok") {
    // Obscure reason to avoid leaking whether the ID exists
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
