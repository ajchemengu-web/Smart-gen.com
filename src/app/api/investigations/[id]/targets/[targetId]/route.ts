import { NextResponse } from "next/server";
import { apiErrorResponse, unlinkInvestigationTarget } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; targetId: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const { id, targetId } = await params;

  try {
    return NextResponse.json(
      await unlinkInvestigationTarget(id, targetId, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
