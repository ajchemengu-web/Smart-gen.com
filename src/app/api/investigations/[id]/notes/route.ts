import { NextResponse } from "next/server";
import { addInvestigationNote, apiErrorResponse } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<{ note: string }>(request);
  if ("response" in parsed) return parsed.response;
  const { note } = parsed.body;

  const { id } = await params;

  try {
    return NextResponse.json(
      await addInvestigationNote(id, note, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
