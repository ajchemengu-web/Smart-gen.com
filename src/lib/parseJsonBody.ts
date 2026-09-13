import { NextResponse } from "next/server";

// Shared guard for Route Handlers that read a JSON body, mirroring
// requireSession()'s early-return shape (src/lib/routeAuth.ts). A
// malformed or empty body (a truncated request, a stray probe hit
// during dev-server route compilation, a future client bug) would
// otherwise throw an unhandled exception out of `request.json()`,
// surfacing as a raw 500 instead of the same clean `{ detail }`
// shape every other error path in this app already returns.
export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<{ body: T } | { response: NextResponse }> {
  try {
    return { body: (await request.json()) as T };
  } catch {
    return {
      response: NextResponse.json(
        { detail: "Invalid or missing JSON request body" },
        { status: 400 }
      ),
    };
  }
}
