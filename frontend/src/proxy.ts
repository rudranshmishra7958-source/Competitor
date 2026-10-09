import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSession, SESSION_COOKIE } from "@/lib/session";

export function proxy(request: NextRequest) {
  let cookieValue = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  try {
    cookieValue = decodeURIComponent(cookieValue);
  } catch {
    /* already decoded */
  }
  const session = parseSession(cookieValue);
  const { pathname } = request.nextUrl;

  if (pathname === "/change-password" && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (
    session?.mustResetPassword &&
    (pathname.startsWith("/admin") || pathname.startsWith("/student"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    url.searchParams.set("required", "1");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/login/admin";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/student")) {
    if (!session || session.role !== "student") {
      const url = request.nextUrl.clone();
      url.pathname = "/login/student";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/login/admin") && session?.role === "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/login/student") && session?.role === "student") {
    const url = request.nextUrl.clone();
    url.pathname = "/student/upcoming";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/login/:path*", "/change-password"],
};
