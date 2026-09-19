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
    try {
      await db.reportPdf.delete({
        where: { reportId: id },
      });
    } catch {
      // Ignore if it doesn't exist
    }

    logAdminAction("CLEAR_PDF_CACHE", { reportId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[clear-pdf]", err);
    return NextResponse.json({ error: "Failed to clear PDF cache" }, { status: 500 });
  }
}
