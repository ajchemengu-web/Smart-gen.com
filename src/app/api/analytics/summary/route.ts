import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, getAnalyticsSummary } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const sinceDaysParam = request.nextUrl.searchParams.get("since_days");
  const sinceDays = sinceDaysParam ? Number(sinceDaysParam) : undefined;

  try {
    return NextResponse.json(
      await getAnalyticsSummary(auth.session.accessToken, sinceDays)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
