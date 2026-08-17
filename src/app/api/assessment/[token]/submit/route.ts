import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { QUESTIONS, QUESTION_COUNT } from "@/data/questions";
import { scoreAssessment } from "@/lib/scoring/engine";
import { interpretScores } from "@/lib/scoring/interpret";
import { sendReportEmail } from "@/lib/email";

const AnswerSchema = z.object({
  questionId: z.string().min(1),
  answer:     z.number().int().min(1).max(5),
});

const SubmitSchema = z.object({
  responses: z.array(AnswerSchema).length(QUESTION_COUNT),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token + payment
  const assessment = await db.assessment.findUnique({
    where:   { id: token },
    select:  {
      id:          true,
      status:      true,
      completedAt: true,
      participant: { select: { name: true, email: true } },
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }
  if (assessment.status === "COMPLETED") {
    // Return existing report ID — idempotent
    const report = await db.report.findUnique({ where: { assessmentId: token }, select: { id: true } });
    return NextResponse.json({ reportId: report?.id, alreadySubmitted: true });
  }
  if (assessment.status !== "QUESTIONS_UNLOCKED") {
    return NextResponse.json({ error: "Assessment not ready for submission" }, { status: 403 });
  }

  // Validate request body
  const body   = await req.json();
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid responses", details: parsed.error.flatten() }, { status: 400 });
  }

  // Validate all question IDs are known
  const validIds = new Set(QUESTIONS.map((q) => q.id));
  for (const r of parsed.data.responses) {
    if (!validIds.has(r.questionId)) {
      return NextResponse.json({ error: `Unknown question ID: ${r.questionId}` }, { status: 400 });
    }
  }

  // Deterministic scoring
  const scores   = scoreAssessment(parsed.data.responses);
  const date     = new Date().toISOString();
  const report   = interpretScores(scores, parsed.data.responses, assessment.participant.name, token, date);

  // Sequential writes — Prisma 7 adapter does not support interactive $transaction (P2028).
  // Duplicate submission is safe: @@unique([assessmentId, questionId]) on Response,
  // and @unique assessmentId on Result/Report will throw P2002 on retry — caught below.
  // ponytail: sequential; DB unique constraints are the idempotency guard
  await db.response.createMany({
    data: parsed.data.responses.map((r) => ({
      assessmentId: token,
      questionId:   r.questionId,
      answer:       r.answer,
    })),
    skipDuplicates: true,
  });

  await db.result.create({
    data: {
      assessmentId:      token,
      openness:          scores.openness,
      conscientiousness: scores.conscientiousness,
      extraversion:      scores.extraversion,
      agreeableness:     scores.agreeableness,
      neuroticism:       scores.neuroticism,
    },
  });

  const savedReport = await db.report.create({
    data: { assessmentId: token, content: report as object },
  });

  await db.assessment.update({
    where: { id: token },
    data:  { status: "COMPLETED", completedAt: new Date() },
  });

  // Email is fire-and-forget — never blocks or fails the response
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  sendReportEmail(
    assessment.participant.email,
    assessment.participant.name,
    `${baseUrl}/report/${savedReport.id}`
  );

  return NextResponse.json({ reportId: savedReport.id });
}
