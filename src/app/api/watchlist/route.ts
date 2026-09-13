import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, createWatchlistTarget, getWatchlist } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  try {
    return NextResponse.json(
      await getWatchlist(auth.session.accessToken, status)
    );
  } catch (error) {
    const { status: httpStatus, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status: httpStatus });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<Parameters<typeof createWatchlistTarget>[0]>(
    request
  );
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(
      await createWatchlistTarget(parsed.body, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
