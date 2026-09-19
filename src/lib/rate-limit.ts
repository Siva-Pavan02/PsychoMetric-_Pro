/**
 * Postgres-backed rate limiter.
 *
 * Uses RateLimitHit rows to count requests within a sliding window.
 * Safe across multiple instances/processes — no in-memory state.
 * ~1% chance of garbage-collecting rows older than 24 h on each call.
 *
 * Interface: swap for Upstash Redis by returning the same { allowed, remaining, retryAfterMs }
 * shape from a different implementation.
 */

import { db } from "@/lib/db";

export interface RateLimitResult {
  allowed:      boolean;
  remaining:    number;
  retryAfterMs: number;
}

export interface RateLimitOptions {
  key:      string;  // e.g. "login:ip:1.2.3.4" or "start:ip:1.2.3.4"
  limit:    number;  // max hits allowed
  windowMs: number;  // window size in milliseconds
}

export async function rateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs);

  // Probabilistic GC — keep the table small without a cron job
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 86_400_000); // 24 h
    db.rateLimitHit.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
  }

  const count = await db.rateLimitHit.count({
    where: { key, createdAt: { gte: windowStart } },
  });

  if (count >= limit) {
    // Find oldest hit in window to compute exact retry-after
    const oldest = await db.rateLimitHit.findFirst({
      where:   { key, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
      select:  { createdAt: true },
    });
    const retryAfterMs = oldest
      ? oldest.createdAt.getTime() + windowMs - Date.now()
      : windowMs;

    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  await db.rateLimitHit.create({ data: { key } });

  return { allowed: true, remaining: limit - count - 1, retryAfterMs: 0 };
}
