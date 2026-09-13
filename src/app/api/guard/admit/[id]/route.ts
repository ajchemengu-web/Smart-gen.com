import { NextResponse } from "next/server";
import { admitUnknown, apiErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const { id } = await params;

  try {
    return NextResponse.json(await admitUnknown(id, auth.session.accessToken));
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
