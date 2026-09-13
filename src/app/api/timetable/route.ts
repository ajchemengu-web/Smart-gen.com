import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, createTimetableEntry, getTimetable } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const course = request.nextUrl.searchParams.get("course") ?? undefined;
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const department =
    request.nextUrl.searchParams.get("department") ?? undefined;
  const semesterParam = request.nextUrl.searchParams.get("semester");
  const semester = semesterParam ? Number(semesterParam) : undefined;

  try {
    return NextResponse.json(
      await getTimetable(auth.session.accessToken, {
        course,
        year,
        department,
        semester,
      })
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<Parameters<typeof createTimetableEntry>[0]>(
    request
  );
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(
      await createTimetableEntry(parsed.body, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
