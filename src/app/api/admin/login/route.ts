import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const isValid = await bcrypt.compare(password, adminPasswordHash);

    if (email === adminEmail && isValid) {
      await createSession();
      return new NextResponse("OK", { status: 200 });
    }

    return new NextResponse("Unauthorized", { status: 401 });
  } catch (error) {
    return new NextResponse("Bad Request", { status: 400 });
  }
}

