import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read session token once — reused in both guards below
  const token = request.cookies.get("admin_session")?.value;

  // Protect /admin/* except /admin/login
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!token || !(await verifySession(token))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Protect /api/admin/* except /api/admin/login and /api/admin/logout
  if (
    pathname.startsWith("/api/admin") &&
    pathname !== "/api/admin/login" &&
    pathname !== "/api/admin/logout"
  ) {
    if (!token || !(await verifySession(token))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  return NextResponse.next();
}

