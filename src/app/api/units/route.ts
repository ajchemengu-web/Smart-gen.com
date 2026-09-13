import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, createUnit, getUnits } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const department =
    request.nextUrl.searchParams.get("department") ?? undefined;
  const course = request.nextUrl.searchParams.get("course") ?? undefined;
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const semesterParam = request.nextUrl.searchParams.get("semester");
  const semester = semesterParam ? Number(semesterParam) : undefined;
  const unclaimed =
    request.nextUrl.searchParams.get("unclaimed") === "true" || undefined;

  try {
    return NextResponse.json(
      await getUnits(auth.session.accessToken, {
        department,
        course,
        year,
        semester,
        unclaimed,
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

  const parsed = await parseJsonBody<Parameters<typeof createUnit>[0]>(
    request
  );
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(
      await createUnit(parsed.body, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
