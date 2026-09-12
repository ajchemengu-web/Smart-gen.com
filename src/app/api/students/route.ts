import { NextResponse } from "next/server";
import { apiErrorResponse, getStudents } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json(await getStudents());
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
