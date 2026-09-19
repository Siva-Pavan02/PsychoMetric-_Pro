import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ReportData } from "@/types";

import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument, PDF_TEMPLATE_VERSION } from "@/lib/pdf/ReportDocument";
import crypto from "crypto";
import React from "react";

import { requireAdmin } from "@/lib/auth";
import { checkReportAccess } from "@/lib/report-token";
import { after } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("t");

  const report = await db.report.findUnique({
    where:  { id },
    select: { 
      content: true,
      accessTokenHash: true,
      expiresAt: true,
      revokedAt: true,
      pdf: {
        select: { bytes: true, contentHash: true }
      }
    },
  });

  if (!report) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    const access = checkReportAccess(report, token);
    if (access !== "ok") {
      return new NextResponse("Report not found", { status: 404 });
    }
  }

  const data = report.content as unknown as ReportData;
  const filename = `psychometric-report-${data.participantName
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  const contentHash = crypto.createHash("sha256").update(JSON.stringify(report.content) + PDF_TEMPLATE_VERSION).digest("hex");

  let bytes: Uint8Array;

  if (report.pdf && report.pdf.contentHash === contentHash) {
    bytes = new Uint8Array(report.pdf.bytes);
    console.log(`[pdf] Serving cached PDF for report ${id}`);
  } else {
    console.log(`[pdf] Generating PDF for report ${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ReportDocument as any, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer: Buffer = await renderToBuffer(element as any);
    bytes = new Uint8Array(buffer);

    // Save asynchronously
    after(async () => {
      try {
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
        console.log(`[pdf] Cached PDF for report ${id}`);
      } catch (err) {
        console.error(`[pdf] Failed to cache PDF for report ${id}:`, err);
      }
    });
  }

  return new Response(Buffer.from(bytes), {
    status:  200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      bytes.length.toString(),
      "Cache-Control":       "private, no-store",
    },
  });
}
