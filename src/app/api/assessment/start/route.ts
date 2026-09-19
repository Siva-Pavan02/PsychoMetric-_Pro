import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const schema = z.object({
  name:  z.string().min(2).max(100).trim(),
  email: z.string().email().max(200).trim().toLowerCase(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/).trim(),
});

export async function POST(req: NextRequest) {
  const ip    = getClientIp(req);
  const limit = await rateLimit({ key: `start:ip:${ip}`, limit: 10, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone } = parsed.data;

    // Prisma 7 driver adapters do not support interactive transactions (P2028).
    // Sequential creates are safe here: if Assessment fails, the orphaned
    // Participant record is harmless (no payment, no assessment attached).
    // ponytail: sequential instead of $transaction — upgrade if Prisma adds adapter tx support
    const participant = await db.participant.create({ data: { name, email, phone } });
    const assessment  = await db.assessment.create({
      data:   { participantId: participant.id, status: "CREATED" },
      select: { id: true },
    });

    return NextResponse.json({ assessmentId: assessment.id });
  } catch (err) {
    console.error("POST /api/assessment/start failed:", err);
    return NextResponse.json(
      { error: "Unable to start assessment. Please try again." },
      { status: 500 }
    );
  }
}
