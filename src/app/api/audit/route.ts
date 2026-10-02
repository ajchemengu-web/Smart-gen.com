import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, getAuditLog } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const search = request.nextUrl.searchParams;

  try {
    return NextResponse.json(
      await getAuditLog(auth.session.accessToken, {
        username: search.get("username") ?? undefined,
        action: search.get("action") ?? undefined,
        subject: search.get("subject") ?? undefined,
        since: search.get("since") ?? undefined,
        until: search.get("until") ?? undefined,
        limit: search.get("limit") ? Number(search.get("limit")) : undefined,
      })
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
