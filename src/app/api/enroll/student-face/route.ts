import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, enrollStudentFace } from "@/lib/api";
import { requireSession } from "@/lib/routeAuth";

// Route Handlers only get typed JSON parsing (parseJsonBody) — this
// one is multipart/form-data instead (reference photos), so it reads
// the incoming FormData directly rather than going through that.
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const formData = await request.formData();

  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" && value !== "" ? value : undefined;
  };

  const studentId = field("student_id");
  const fullName = field("full_name");
  const admissionNumber = field("admission_number");
  const hostel = field("hostel");
  const room = field("room");

  if (!studentId || !fullName || !admissionNumber || !hostel || !room) {
    return NextResponse.json(
      {
        detail:
          "student_id, full_name, admission_number, hostel, and room are required.",
      },
      { status: 400 }
    );
  }

  const photos = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (photos.length === 0) {
    return NextResponse.json(
      { detail: "At least one reference photo is required." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      await enrollStudentFace(
        {
          student_id: studentId,
          full_name: fullName,
          admission_number: admissionNumber,
          hostel,
          room,
          department: field("department"),
          course: field("course"),
          year: field("year"),
          semester: field("semester"),
        },
        photos,
        auth.session.accessToken
      )
    );
  } catch (error) {
    const { status, body } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
