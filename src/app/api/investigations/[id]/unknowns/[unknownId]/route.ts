import { NextResponse } from "next/server";
import { apiErrorResponse, unlinkInvestigationUnknown } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; unknownId: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const { id, unknownId } = await params;

  try {
    return NextResponse.json(
      await unlinkInvestigationUnknown(
        id,
        unknownId,
        auth.session.accessToken
      )
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
