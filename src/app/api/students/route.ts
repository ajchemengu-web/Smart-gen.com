import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, createStudent, getStudents } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(await getStudents(auth.session.accessToken));
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<Parameters<typeof createStudent>[0]>(
    request
  );
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(
      await createStudent(parsed.body, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
