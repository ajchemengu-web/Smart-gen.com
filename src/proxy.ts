import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";

// Renamed from `middleware.ts` in this Next.js version — see
// AGENTS.md and node_modules/next/dist/docs/01-app/03-api-reference/
// 03-file-conventions/proxy.md.
//
// Optimistic auth check per Next's authentication guide: only reads
// the session cookie (no backend call), so a guard/admin/temporary-
// admin can no longer reach another role's dashboard just by typing
// its URL — the gap flagged since the dashboards were first built.

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await decryptSession(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const requestedSlug = pathname.split("/")[2];

    if (requestedSlug && requestedSlug !== session.dashboard) {
      return NextResponse.redirect(
        new URL(`/dashboard/${session.dashboard}`, request.url)
      );
    }

    return NextResponse.next();
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(
      new URL(`/dashboard/${session.dashboard}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
