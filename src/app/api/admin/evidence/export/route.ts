import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const participants = await db.participant.findMany({
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      assessments: {
        include: { report: true },
        orderBy: { startedAt: "desc" },
        take: 1
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let csvContent = "Participant ID,Name,Email,Created At,Payment Status,Payment Method,Amount,Assessment Status,Report ID\n";

  for (const p of participants) {
    const payment = p.payments?.[0];
    const assessment = p.assessments?.[0];
    const isPaid = payment?.status === "SUCCESS";
    const amount = isPaid ? payment?.amount : 0;
    const paymentMethod = "Razorpay";
    const paymentStatus = payment?.status || "PENDING";
    const assessmentStatus = assessment?.status || "PENDING";
    const reportId = assessment?.report?.id || "";

    const row = [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.email,
      p.createdAt.toISOString(),
      paymentStatus,
      paymentMethod,
      amount,
      assessmentStatus,
      reportId,
    ].join(",");
    
    csvContent += row + "\n";
  }

  const encoder = new TextEncoder();
  const bytes = encoder.encode(csvContent);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="psychometric-pro-evidence.csv"',
    },
  });
}
