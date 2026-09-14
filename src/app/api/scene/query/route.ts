import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, querySceneReconstruction } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const location = request.nextUrl.searchParams.get("location") ?? undefined;
  const startTime =
    request.nextUrl.searchParams.get("start_time") ?? undefined;
  const endTime = request.nextUrl.searchParams.get("end_time") ?? undefined;
  const coOccurrenceMinutesRaw = request.nextUrl.searchParams.get(
    "co_occurrence_minutes"
  );
  const coOccurrenceMinutes = coOccurrenceMinutesRaw
    ? Number(coOccurrenceMinutesRaw)
    : undefined;

  try {
    return NextResponse.json(
      await querySceneReconstruction(
        { location, startTime, endTime, coOccurrenceMinutes },
        auth.session.accessToken
      )
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
