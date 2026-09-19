import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument, PDF_TEMPLATE_VERSION } from "@/lib/pdf/ReportDocument";
import crypto from "crypto";
import React from "react";
import { ReportData } from "@/types";

export const runtime = "nodejs";

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
      select: { content: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const data = report.content as unknown as ReportData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(ReportDocument as any, { data });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any);
    const bytes = new Uint8Array(buffer);

    const contentHash = crypto.createHash("sha256").update(JSON.stringify(report.content) + PDF_TEMPLATE_VERSION).digest("hex");

    await db.reportPdf.upsert({
      where: { reportId: id },
      create: {
        reportId: id,
        bytes: Buffer.from(bytes),
        contentHash,
      },
      update: {
        bytes: Buffer.from(bytes),
        contentHash,
        createdAt: new Date(),
      }
    });

    logAdminAction("REGEN_PDF", { reportId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[regen-pdf]", err);
    return NextResponse.json({ error: "Failed to regenerate PDF" }, { status: 500 });
  }
}
