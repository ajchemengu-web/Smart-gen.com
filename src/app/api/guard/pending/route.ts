import { NextResponse } from "next/server";
import { apiErrorResponse, getPendingUnknowns } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(
      await getPendingUnknowns(auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
