import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getQuestionTexts } from "@/data/questions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const assessment = await db.assessment.findUnique({
    where:  { id: token },
    select: { status: true },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }
  if (assessment.status !== "QUESTIONS_UNLOCKED") {
    return NextResponse.json({ error: "Assessment not unlocked" }, { status: 403 });
  }

  // Only expose id, text, order — never trait/reverseScored
  return NextResponse.json({ questions: getQuestionTexts() });
}
