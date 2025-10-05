import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const authHeader = request.headers.get("authorization")
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123"

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      // Check for cookie-based auth
      const authCookie = request.cookies.get("admin_auth")?.value

      if (authCookie !== adminPassword) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/dashboard/:path*",
}
