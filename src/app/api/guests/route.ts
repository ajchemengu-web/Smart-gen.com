import { NextResponse } from "next/server";
import { apiErrorResponse, getGuests } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(await getGuests(auth.session.accessToken));
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
