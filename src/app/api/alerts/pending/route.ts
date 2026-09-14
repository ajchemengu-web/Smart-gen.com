import { NextResponse } from "next/server";
import { apiErrorResponse, getPendingAlerts } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(
      await getPendingAlerts(auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
