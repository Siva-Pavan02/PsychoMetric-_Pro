import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// ─── In-memory rate limiter ─────────────────────────────────────────────────
// Resets on cold-start — acceptable for a single-admin, low-traffic deployment.
// For distributed/production: replace with Upstash Redis or Vercel KV.

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface FailRecord {
  count: number;
  resetAt: number;
}

const failMap = new Map<string, FailRecord>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = failMap.get(ip);

  if (!rec || now >= rec.resetAt) {
    // Window expired or first request — clean slate
    return false;
  }

  return rec.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const rec = failMap.get(ip);

  if (!rec || now >= rec.resetAt) {
    failMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

function clearFailures(ip: string): void {
  failMap.delete(ip);
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const isValid = await bcrypt.compare(password, adminPasswordHash);

    if (email === adminEmail && isValid) {
      clearFailures(ip);
      await createSession();
      return new NextResponse("OK", { status: 200 });
    }

    recordFailure(ip);
    return new NextResponse("Unauthorized", { status: 401 });
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }
}
