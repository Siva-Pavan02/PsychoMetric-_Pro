import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/admin/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const participants = await db.participant.findMany({
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      assessments: {
        include: { report: true },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Header
  const headers = [
    "Participant ID",
    "Name",
    "Email",
    "Created At",
    "Payment Status",
    "Payment Gateway",
    "Payment Method",
    "Amount (INR)",
    "Razorpay Order ID",
    "Razorpay Payment ID",
    "Assessment Status",
    "Report ID",
  ];

  const rows: string[] = [headers.join(",")];

  for (const p of participants) {
    const payment = p.payments?.[0];
    const assessment = p.assessments?.[0];
    const isPaid = payment?.status === "SUCCESS";

    // amount is stored in paise — convert to rupees at export boundary
    const amountRupees = isPaid && payment?.amount != null
      ? paiseToRupees(payment.amount).toFixed(0)
      : "0";

    const row = [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.email,
      p.createdAt.toISOString(),
      payment?.status ?? "NONE",
      "Razorpay",
      "Not available",
      amountRupees,
      payment?.razorpayOrderId ?? "",
      payment?.razorpayPaymentId ?? "",
      assessment?.status ?? "NONE",
      assessment?.report?.id ?? "",
    ].join(",");

    rows.push(row);
  }

  const csvContent = rows.join("\n");
  const encoder = new TextEncoder();
  const bytes = encoder.encode(csvContent);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="psychometric-pro-evidence.csv"',
    },
  });
}
