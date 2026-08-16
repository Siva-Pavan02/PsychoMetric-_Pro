import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const adminSlug = process.env.ADMIN_SLUG;
  if (!adminSlug) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  }

  const [participants, completedAssessments, successfulPayments] = await Promise.all([
    db.participant.count(),
    db.assessment.count({ where: { status: "COMPLETED" } }),
    db.payment.findMany({
      where:  { status: "SUCCESS" },
      select: { amount: true, currency: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalRevenuePaise = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({
    participants,
    completedAssessments,
    successfulPayments: successfulPayments.length,
    totalRevenueRupees: totalRevenuePaise / 100,
    recentTransactions: successfulPayments.slice(0, 10).map((p) => ({
      amount:    p.amount / 100,
      currency:  p.currency,
      createdAt: p.createdAt,
    })),
  });
}
