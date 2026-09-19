import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  
  try {
    const { days } = await req.json();
    const addDays = typeof days === "number" && days > 0 ? days : 30;

    const report = await db.report.findUnique({ where: { id }, select: { expiresAt: true } });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const baseDate = report.expiresAt && report.expiresAt > new Date() ? report.expiresAt : new Date();
    const newExpiry = new Date(baseDate.getTime() + addDays * 24 * 60 * 60 * 1000);

    await db.report.update({
      where: { id },
      data: { expiresAt: newExpiry },
    });
    
    logAdminAction("EXTEND_REPORT_TOKEN", { reportId: id, addDays, newExpiry });
    return NextResponse.json({ success: true, newExpiry });
  } catch (err) {
    console.error("[extend]", err);
    return NextResponse.json({ error: "Failed to extend token" }, { status: 500 });
  }
}
