import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, linkInvestigationTarget } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const parsed = await parseJsonBody<{ target_id: string }>(request);
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(
      await linkInvestigationTarget(
        id,
        parsed.body.target_id,
        auth.session.accessToken
      )
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
