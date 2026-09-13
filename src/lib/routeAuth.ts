import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/session";

// Shared guard for the Route Handlers under src/app/api/* that
// proxy to the backend. src/proxy.ts already blocks unauthenticated
// browser navigation to /dashboard/*, but these API routes are a
// separate attack surface (someone could hit /api/students directly
// without ever loading a dashboard page) — so they check the
// session themselves too, rather than relying on the page-level
// redirect alone.

export async function requireSession(): Promise<
  { session: SessionPayload } | { response: NextResponse }
> {
  const cookieStore = await cookies();
  const session = await decryptSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  if (!session) {
    return {
      response: NextResponse.json(
        { detail: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  return { session };
}
