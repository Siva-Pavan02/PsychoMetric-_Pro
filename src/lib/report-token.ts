/**
 * Report access token helpers.
 *
 * Tokens are 32 random bytes, base64url-encoded (44 chars, URL-safe).
 * Only the SHA-256 hash is stored in the DB — the raw token is never persisted.
 *
 * Token lifetime: REPORT_TOKEN_TTL_DAYS env var, default 365 days.
 */

import crypto from "crypto";

const TTL_DAYS = parseInt(process.env.REPORT_TOKEN_TTL_DAYS ?? "365", 10);

/** Generate a new raw token (44 chars, base64url, URL-safe). */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest of a raw token. Store this, not the token. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Expiry date from now. */
export function tokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + TTL_DAYS);
  return d;
}

/** Constant-time comparison of a presented token against a stored hash. */
export function verifyToken(presented: string, storedHash: string): boolean {
  const presented_hash = hashToken(presented);
  const a = Buffer.from(presented_hash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Gate a report: check token, expiry, and revocation.
 * Returns null if valid, or an error string if denied.
 *
 * Legacy mode: if `ALLOW_LEGACY_REPORT_LINKS=true` and `accessTokenHash` is null,
 * we allow access (backward compat for links already emailed before Phase 3).
 */
export function checkReportAccess(
  report: {
    accessTokenHash:      string | null;
    expiresAt:            Date   | null;
    revokedAt:            Date   | null;
  },
  presentedToken: string | null
): "ok" | "not_found" | "revoked" | "expired" | "bad_token" {
  // Revoked always wins
  if (report.revokedAt) return "revoked";

  // Legacy links (no token stored)
  if (!report.accessTokenHash) {
    const allowLegacy = process.env.ALLOW_LEGACY_REPORT_LINKS !== "false";
    return allowLegacy ? "ok" : "not_found"; // treat as 404 when legacy is disabled
  }

  // Token required
  if (!presentedToken) return "bad_token";
  if (!verifyToken(presentedToken, report.accessTokenHash)) return "bad_token";

  // Check expiry
  if (report.expiresAt && report.expiresAt < new Date()) return "expired";

  return "ok";
}

/**
 * Issue a fresh raw token for an existing report (the original is never
 * recoverable — only its hash is stored). Used wherever a report link has
 * to be (re-)sent after creation: resume/recovery emails, admin resend.
 */
export async function reissueReportToken(reportId: string): Promise<string> {
  const { db } = await import("@/lib/db");
  const token = generateToken();
  await db.report.update({
    where: { id: reportId },
    data: { accessTokenHash: hashToken(token), accessTokenCreatedAt: new Date() },
  });
  return token;
}
