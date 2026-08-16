import { cookies } from "next/headers";

const SESSION_COOKIE = "admin_session";

async function getSecretKey() {
  const secret = process.env.ADMIN_PASSWORD_HASH || "fallback_secret_do_not_use_in_prod";
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSession() {
  const key = await getSecretKey();
  const data = "admin";
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const token = `${data}.${signatureHex}`;
  
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
    const [data, signatureHex] = token.split(".");
    if (data !== "admin" || !signatureHex) return false;
    
    const key = await getSecretKey();
    const encoder = new TextEncoder();
    
    const expectedSignature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    const expectedHex = Array.from(new Uint8Array(expectedSignature)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return signatureHex === expectedHex;
  } catch {
    return false;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
