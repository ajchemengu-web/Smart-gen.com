import { NextResponse } from "next/server";
import { apiErrorResponse, updateCameraStatus } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const { status } = await request.json();

  try {
    return NextResponse.json(
      await updateCameraStatus(id, status, auth.session.accessToken)
    );
  } catch (error) {
    const { status: httpStatus, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status: httpStatus });
  }
}
