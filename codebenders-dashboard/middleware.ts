import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware-client"
import { canAccess, type Role } from "@/lib/roles"

const SUPABASE_CONFIGURED =
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If Supabase auth is not configured, allow all traffic through
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.next()
  }

  // Auth callback must be reachable without a session
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next()
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user) {
    // Already heading to login — let through
    if (pathname === "/login") return supabaseResponse

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user trying to access /login — send to dashboard
  if (pathname === "/login") {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    return NextResponse.redirect(homeUrl)
  }

  // ── Role resolution ────────────────────────────────────────────────────────
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const role = (roleData?.role ?? "leadership") as Role

  // ── Access check ───────────────────────────────────────────────────────────
  if (!canAccess(pathname, role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    return NextResponse.redirect(homeUrl)
  }

  // ── Forward role + user-id to route handlers via request headers ───────────
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-user-role", role)
  requestHeaders.set("x-user-id", user.id)
  requestHeaders.set("x-user-email", user.email ?? "")

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Copy auth cookies set by updateSession
  supabaseResponse.cookies.getAll().forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, cookie)
  })

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
