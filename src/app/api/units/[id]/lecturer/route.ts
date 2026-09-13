import { NextResponse } from "next/server";
import { apiErrorResponse, setUnitLecturer } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<{ lecturer_id: string | null }>(request);
  if ("response" in parsed) return parsed.response;
  const { lecturer_id: lecturerId } = parsed.body;

  const { id } = await params;

  try {
    return NextResponse.json(
      await setUnitLecturer(Number(id), lecturerId, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
