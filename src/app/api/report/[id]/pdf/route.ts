import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ReportData } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const report = await db.report.findUnique({
    where:  { id },
    select: { content: true },
  });

  if (!report) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const data = report.content as unknown as ReportData;

  // Dynamic import keeps @react-pdf/renderer out of the edge bundle
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { ReportDocument } = await import("@/lib/pdf/ReportDocument");
  const React = (await import("react")).default;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ReportDocument as any, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer: Buffer = await renderToBuffer(element as any);
  const bytes = new Uint8Array(buffer);

  const filename = `psychometric-report-${data.participantName
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  return new NextResponse(bytes, {
    status:  200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "private, no-store",
    },
  });
}
