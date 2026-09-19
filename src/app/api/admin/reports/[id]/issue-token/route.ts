import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateToken, hashToken, tokenExpiresAt } from "@/lib/report-token";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const rawToken = generateToken();
    await db.report.update({
      where: { id },
      data: {
        accessTokenHash: hashToken(rawToken),
        accessTokenCreatedAt: new Date(),
        expiresAt: tokenExpiresAt(),
        revokedAt: null, // Clear revocation
      },
    });
    
    logAdminAction("ISSUE_REPORT_TOKEN", { reportId: id });

    // Admin gets the raw token once. They must copy it or it's gone.
    return NextResponse.json({ success: true, token: rawToken });
  } catch (err) {
    console.error("[issue-token]", err);
    return NextResponse.json({ error: "Failed to issue token" }, { status: 500 });
  }
}
