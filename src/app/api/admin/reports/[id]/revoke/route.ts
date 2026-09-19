import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    await db.report.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    
    logAdminAction("REVOKE_REPORT_TOKEN", { reportId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[revoke]", err);
    return NextResponse.json({ error: "Failed to revoke report" }, { status: 500 });
  }
}
