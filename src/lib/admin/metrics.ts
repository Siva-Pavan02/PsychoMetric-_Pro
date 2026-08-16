/**
 * Admin Metrics — single source of truth for all dashboard data.
 *
 * IMPORTANT: Payment.amount is stored in PAISE in the database.
 * Rupee conversion (÷ 100) happens at the presentation boundary via currency.ts.
 */

import { db } from "@/lib/db";
export { paiseToRupees, formatRupees, formatPaise, PAISE_PER_RUPEE } from "./currency";
import { paiseToRupees, formatRupees } from "./currency";


export interface AdminMetrics {
  /** Count of Participant rows. */
  totalParticipants: number;
  /** Count of Assessment rows where status = COMPLETED. */
  completedAssessments: number;
  /** Count of Assessment rows where status NOT IN (COMPLETED). */
  pendingAssessments: number;
  /** Count of Payment rows where status = SUCCESS. */
  successfulPaymentCount: number;
  /** Count of Payment rows where status = FAILED. */
  failedPaymentCount: number;
  /** Count of Payment rows where status IN (CREATED, PENDING). */
  pendingPaymentCount: number;
  /** SUM of successful Payment.amount values — in PAISE. */
  totalRevenuePaise: number;
  /** SUM converted to rupees (display-ready). */
  totalRevenueRupees: number;
  /** Formatted INR string for UI. */
  totalRevenueFormatted: string;
  /** Average of successful Payment.amount — in rupees. Zero when no payments. */
  avgSuccessfulPaymentRupees: number;
  /** Count of Report rows. */
  reportsGenerated: number;
  /** Server timestamp when these metrics were calculated. */
  calculatedAt: Date;
}

/** Fetch all admin metrics from the database. No caching — always fresh. */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [
    totalParticipants,
    completedAssessments,
    pendingAssessments,
    successfulPaymentAgg,
    failedPaymentCount,
    pendingPaymentCount,
    reportsGenerated,
  ] = await Promise.all([
    db.participant.count(),
    db.assessment.count({ where: { status: "COMPLETED" } }),
    db.assessment.count({ where: { status: { not: "COMPLETED" } } }),
    db.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.payment.count({ where: { status: "FAILED" } }),
    db.payment.count({ where: { status: { in: ["CREATED", "PENDING"] } } }),
    db.report.count(),
  ]);

  const successfulPaymentCount = successfulPaymentAgg._count._all;
  const totalRevenuePaise = successfulPaymentAgg._sum.amount ?? 0;
  const totalRevenueRupees = paiseToRupees(totalRevenuePaise);
  const avgSuccessfulPaymentRupees =
    successfulPaymentCount > 0
      ? paiseToRupees(totalRevenuePaise / successfulPaymentCount)
      : 0;

  return {
    totalParticipants,
    completedAssessments,
    pendingAssessments,
    successfulPaymentCount,
    failedPaymentCount,
    pendingPaymentCount,
    totalRevenuePaise,
    totalRevenueRupees,
    totalRevenueFormatted: formatRupees(totalRevenueRupees),
    avgSuccessfulPaymentRupees,
    reportsGenerated,
    calculatedAt: new Date(),
  };
}

/** Fetch current record counts — used by the reset confirmation UI. */
export async function getResetPreviewCounts() {
  const [participants, assessments, responses, payments, results, reports] =
    await Promise.all([
      db.participant.count(),
      db.assessment.count(),
      db.response.count(),
      db.payment.count(),
      db.result.count(),
      db.report.count(),
    ]);

  return { participants, assessments, responses, payments, results, reports };
}
