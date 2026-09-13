import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, createTimetableEntry, getTimetable } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const course = request.nextUrl.searchParams.get("course") ?? undefined;
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;

  try {
    return NextResponse.json(
      await getTimetable(auth.session.accessToken, { course, year })
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const fields = await request.json();

  try {
    return NextResponse.json(
      await createTimetableEntry(fields, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
