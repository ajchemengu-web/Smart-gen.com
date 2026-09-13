import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, createCamera, getCameras } from "@/lib/api";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { requireSession } from "@/lib/routeAuth";

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const camera_type =
    request.nextUrl.searchParams.get("camera_type") ?? undefined;
  const department =
    request.nextUrl.searchParams.get("department") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  try {
    return NextResponse.json(
      await getCameras(auth.session.accessToken, {
        camera_type,
        department,
        status,
      })
    );
  } catch (error) {
    const { status: httpStatus, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status: httpStatus });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = await parseJsonBody<Parameters<typeof createCamera>[0]>(
    request
  );
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(
      await createCamera(parsed.body, auth.session.accessToken)
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
