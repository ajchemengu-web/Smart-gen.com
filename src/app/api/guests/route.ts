import { NextResponse } from "next/server";
import { apiErrorResponse, getGuests } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json(await getGuests());
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
