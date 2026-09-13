import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Called by src/lib/handleUnauthorized.ts when a proxied backend
// call comes back 401 even though the session cookie itself still
// decrypts fine (e.g. Alternative_Identifier's JWT_SECRET rotated,
// or the backend restarted with a different one — the cookie and
// the backend's access_token share the same 12h TTL by design, so
// this shouldn't happen from ordinary expiry, only a secret
// mismatch). Clears the now-unusable cookie so the client's
// redirect to /login isn't immediately bounced back by src/proxy.ts
// seeing a still-"valid" session.
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
