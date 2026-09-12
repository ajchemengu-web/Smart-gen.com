import { NextResponse } from "next/server";
import { apiErrorResponse, getAccessLogs } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json(await getAccessLogs());
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
