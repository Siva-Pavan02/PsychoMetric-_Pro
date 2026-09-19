/**
 * Extract the real client IP from a Next.js request.
 * Checks x-forwarded-for (set by proxies/Vercel) first, then x-real-ip.
 */

import { NextRequest } from "next/server";

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    // Rightmost entry is appended by our own edge/proxy hop, so it's the
    // one hop a client can't spoof — the client-supplied entries are all
    // to the left of it.
    const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
