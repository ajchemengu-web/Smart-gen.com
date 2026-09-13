import { NextResponse } from "next/server";
import { apiErrorResponse, updateTimetableEntryStatus } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<{ status: string }>(request);
  if ("response" in parsed) return parsed.response;
  const { status } = parsed.body;

  const { id } = await params;

  try {
    return NextResponse.json(
      await updateTimetableEntryStatus(
        Number(id),
        status,
        auth.session.accessToken
      )
    );
  } catch (error) {
    const { status: httpStatus, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status: httpStatus });
  }
}
