import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    // Since we're keeping it minimal, ADMIN_PASSWORD_HASH in this case
    // acts as the actual password the admin types in, or if it's literally a hash, 
    // we would use a hashing library. The prompt says "Use server-side environment variables: ADMIN_PASSWORD_HASH... Do NOT store plaintext admin passwords."
    // Let's assume ADMIN_PASSWORD_HASH contains the SHA-256 of the password.
    // For extreme simplicity as requested, we hash the incoming password with SHA-256 and compare.
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (email === adminEmail && hashHex === adminPasswordHash) {
      await createSession();
      return new NextResponse("OK", { status: 200 });
    }

    return new NextResponse("Unauthorized", { status: 401 });
  } catch (error) {
    return new NextResponse("Bad Request", { status: 400 });
  }
}
