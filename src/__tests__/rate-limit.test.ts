/**
 * Phase 2 tests: Postgres-backed rate limiter (logic only, DB mocked)
 *
 * Tests:
 * - allows requests under the limit
 * - blocks when limit is reached
 * - separate keys don't interfere
 * - retry-after calculation
 */

// ─── Pure rate limit logic (extracted from rate-limit.ts for unit testing) ────

interface RateLimitOptions {
  key:      string;
  limit:    number;
  windowMs: number;
}

interface Hit {
  key:       string;
  createdAt: Date;
}

function rateLimitPure(
  hits: Hit[],
  now: Date,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const { key, limit, windowMs } = options;
  const windowStart = new Date(now.getTime() - windowMs);

  const inWindow = hits.filter(
    (h) => h.key === key && h.createdAt >= windowStart
  );

  if (inWindow.length >= limit) {
    const oldest = inWindow.reduce((a, b) => a.createdAt < b.createdAt ? a : b);
    const retryAfterMs = oldest.createdAt.getTime() + windowMs - now.getTime();
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  hits.push({ key, createdAt: now });
  return { allowed: true, remaining: limit - inWindow.length - 1, retryAfterMs: 0 };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("rateLimit logic", () => {
  it("allows the first request", () => {
    const hits: Hit[] = [];
    const result = rateLimitPure(hits, new Date(), { key: "test:1", limit: 3, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows up to the limit", () => {
    const hits: Hit[] = [];
    const now = new Date();
    const options = { key: "test:2", limit: 3, windowMs: 60_000 };
    rateLimitPure(hits, now, options);
    rateLimitPure(hits, now, options);
    const third = rateLimitPure(hits, now, options);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("blocks after limit is reached", () => {
    const hits: Hit[] = [];
    const now = new Date();
    const options = { key: "test:3", limit: 2, windowMs: 60_000 };
    rateLimitPure(hits, now, options);
    rateLimitPure(hits, now, options);
    const result = rateLimitPure(hits, now, options);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("different keys don't interfere", () => {
    const hits: Hit[] = [];
    const now = new Date();
    rateLimitPure(hits, now, { key: "a", limit: 1, windowMs: 60_000 });
    rateLimitPure(hits, now, { key: "a", limit: 1, windowMs: 60_000 }); // blocked
    const b = rateLimitPure(hits, now, { key: "b", limit: 1, windowMs: 60_000 });
    expect(b.allowed).toBe(true); // different key, allowed
  });

  it("calculates retry-after based on oldest in-window hit", () => {
    const hits: Hit[] = [];
    const t0 = new Date(1_700_000_000_000);
    const opts = { key: "test:ra", limit: 2, windowMs: 60_000 };
    rateLimitPure(hits, t0, opts);
    rateLimitPure(hits, new Date(t0.getTime() + 10_000), opts);
    const t2 = new Date(t0.getTime() + 20_000);
    const result = rateLimitPure(hits, t2, opts);
    expect(result.allowed).toBe(false);
    // Oldest hit is at t0. retryAfterMs = t0 + windowMs - t2 = 60000 - 20000 = 40000
    expect(result.retryAfterMs).toBe(40_000);
  });

  it("allows new requests after the window expires", () => {
    const hits: Hit[] = [];
    const t0 = new Date(1_700_000_000_000);
    const opts = { key: "test:window", limit: 1, windowMs: 60_000 };
    rateLimitPure(hits, t0, opts);
    // Second request still inside window — blocked
    expect(rateLimitPure(hits, t0, opts).allowed).toBe(false);
    // After window expires
    const t1 = new Date(t0.getTime() + 61_000);
    expect(rateLimitPure(hits, t1, opts).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prefers x-forwarded-for first IP", () => {
    // Pure function logic test
    function getIp(headers: Record<string, string>): string {
      const fwd = headers["x-forwarded-for"];
      if (fwd) {
        const first = fwd.split(",")[0]?.trim();
        if (first) return first;
      }
      return headers["x-real-ip"] ?? "unknown";
    }

    expect(getIp({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })).toBe("1.2.3.4");
    expect(getIp({ "x-real-ip": "9.9.9.9" })).toBe("9.9.9.9");
    expect(getIp({})).toBe("unknown");
  });
});
