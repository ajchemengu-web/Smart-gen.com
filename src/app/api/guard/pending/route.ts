import { NextResponse } from "next/server";
import { apiErrorResponse, getPendingUnknowns } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json(await getPendingUnknowns());
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
