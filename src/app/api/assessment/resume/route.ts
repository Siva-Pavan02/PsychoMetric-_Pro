/**
 * POST /api/assessment/resume
 *
 * Accepts an email, reconciles all pending assessments for that email,
 * and sends recovery links. Always returns 200 (neutral response — never
 * reveals whether the email exists or has paid).
 *
 * TODO Phase 4: use the proper email helper with logging once it exists.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reconcileAssessment } from "@/lib/payments/reconcile";
import { reissueReportToken } from "@/lib/report-token";
import { sendReportEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const schema = z.object({
  email: z.string().email().max(200).trim().toLowerCase(),
});

const NEUTRAL = NextResponse.json({ message: "If we found an assessment, a recovery link has been sent." }, { status: 200 });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const ipLimit = await rateLimit({ key: `resume:ip:${ip}`, limit: 5, windowMs: 60_000 });
  if (!ipLimit.allowed) return NEUTRAL;

  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NEUTRAL;

  const { email } = parsed.data;

  const emailLimit = await rateLimit({ key: `resume:email:${email}`, limit: 3, windowMs: 60_000 });
  if (!emailLimit.allowed) return NEUTRAL;

  try {
    const participants = await db.participant.findMany({
      where: { email },
      include: {
        assessments: {
          include: { payment: true, report: true },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

    for (const participant of participants) {
      for (const assessment of participant.assessments) {
        if (assessment.payment && ["CREATED", "PENDING"].includes(assessment.payment.status)) {
          await reconcileAssessment(assessment.id).catch(() => {});
        }

        const fresh = await db.assessment.findUnique({
          where: { id: assessment.id },
          select: { status: true, report: { select: { id: true } } },
        });

        const baseLink = fresh?.status === "COMPLETED" && fresh.report
          ? `${baseUrl}/report/${fresh.report.id}?t=${await reissueReportToken(fresh.report.id)}`
          : fresh?.status === "QUESTIONS_UNLOCKED"
          ? `${baseUrl}/assessment/${assessment.id}/questions`
          : null;

        if (baseLink) {
          sendReportEmail(
            participant.email,
            participant.name,
            baseLink
          );
        }
      }
    }
  } catch (err) {
    console.error("[assessment/resume]", err);
  }

  return NEUTRAL;
}
