import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { logAdminAction } from "@/lib/audit";

// ponytail: replaced in-memory Map with Postgres-backed rateLimit (Phase 2)
// Rate limit only on failure — successful logins clear nothing (Postgres handles TTL)

export async function POST(req: NextRequest) {
  const ip    = getClientIp(req);
  const limit = await rateLimit({ key: `login:ip:${ip}`, limit: 10, windowMs: 15 * 60_000 });

  if (!limit.allowed) {
    const retryAfterS = Math.ceil(limit.retryAfterMs / 1000);
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfterS) },
    });
  }

  try {
    const { email, password } = await req.json();

    const adminEmail        = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const isValid = await bcrypt.compare(password as string, adminPasswordHash);

    if (email === adminEmail && isValid) {
      await createSession();
      logAdminAction("ADMIN_LOGIN", { ip });
      return new NextResponse("OK", { status: 200 });
    }

    // Separate failure limiter on email to catch credential stuffing
    const emailLimit = await rateLimit({ key: `login:email:${email}`, limit: 10, windowMs: 15 * 60_000 });
    if (!emailLimit.allowed) {
      const retryAfterS = Math.ceil(emailLimit.retryAfterMs / 1000);
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": String(retryAfterS) },
      });
    }

    return new NextResponse("Unauthorized", { status: 401 });
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }
}
