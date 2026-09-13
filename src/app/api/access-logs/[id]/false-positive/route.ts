import { NextResponse } from "next/server";
import { apiErrorResponse, flagAccessLogFalsePositive } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<{ reason: string }>(request);
  if ("response" in parsed) return parsed.response;
  const { reason } = parsed.body;

  const { id } = await params;

  try {
    return NextResponse.json(
      await flagAccessLogFalsePositive(Number(id), reason, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
