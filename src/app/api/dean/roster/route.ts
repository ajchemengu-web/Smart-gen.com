import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, getDeanRoster } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const department =
    request.nextUrl.searchParams.get("department") ?? undefined;

  try {
    return NextResponse.json(
      await getDeanRoster(auth.session.accessToken, department)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
