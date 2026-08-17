import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function getSecretKey(): string {
  const secret = process.env.ADMIN_PASSWORD_HASH;
  if (!secret) {
    throw new Error("ADMIN_PASSWORD_HASH environment variable is required.");
  }
  return secret;
}

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  // Lengths must match before timingSafeEqual (different lengths short-circuit the padding)
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function createSession(): Promise<void> {
  const secret = getSecretKey();
  const issuedAt = Date.now();
  const payload = `admin.${issuedAt}`;
  const sig = signPayload(payload, secret);
  const token = `${payload}.${sig}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 1 day
    path: "/",
  });
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    const secret = getSecretKey();

    // Token format: "admin.<issuedAt>.<signature>"
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return false;

    const payload = token.slice(0, lastDot);
    const sigHex = token.slice(lastDot + 1);

    // Constant-time signature verification
    const expectedSig = signPayload(payload, secret);
    if (!timingSafeCompare(sigHex, expectedSig)) return false;

    // Payload format: "admin.<issuedAt>"
    const parts = payload.split(".");
    if (parts.length !== 2 || parts[0] !== "admin") return false;

    const issuedAt = parseInt(parts[1], 10);
    if (isNaN(issuedAt)) return false;

    // Server-side expiry check — bounds validity to SESSION_TTL_MS
    if (Date.now() - issuedAt > SESSION_TTL_MS) return false;

    return true;
  } catch {
    return false;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
