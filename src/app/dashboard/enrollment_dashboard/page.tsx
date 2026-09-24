import { cookies } from "next/headers";
import EnrollForm from "../../enroll/EnrollForm";
import StudentFaceEnrollmentClient from "@/components/StudentFaceEnrollmentClient";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";
import formStyles from "../../form.module.css";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getCameras } from "@/lib/api";

export const metadata = {
  title: "Enrollment Dashboard — Smart Gen",
};

// The Temporary Admin's *only* capability (docs/PRD.md §8): data
// entry / facial-enrollment help, nothing else. Their access
// expires once an Original Admin marks their task complete
// (POST /admin/temporary-admins/{username}/complete in
// Alternative_Identifier) — this dashboard has no self-service way
// to end that early, by design.
export default async function EnrollmentDashboardPage() {
  const cookieStore = await cookies();
  const session = await decryptSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  // Same checkpoint-location sourcing as /enroll — see that page for
  // why a Guard's location must come from the camera registry rather
  // than free text.
  let checkpointLocations: string[] = [];

  if (session) {
    const cameras = await getCameras(session.accessToken, {
      camera_type: "CHECKPOINT",
    }).catch(() => []);

    checkpointLocations = [
      ...new Set(
        cameras
          .map((camera) => camera.location)
          .filter((location): location is string => Boolean(location))
      ),
    ];
  }

  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>Enrollment Dashboard</h1>
          <LogoutButton />
        </div>
        <p className={shell.subtitle}>
          Create a login for a Student, Lecturer, Guard, Staff member, or
          Admin, and separately enroll a Student&apos;s face for
          recognition. Your access here expires once an Original Admin
          marks your task complete.
        </p>
        <div className={formStyles.card}>
          <EnrollForm checkpointLocations={checkpointLocations} />
        </div>
        <h2>Facial enrollment (Student)</h2>
        <p className={shell.subtitle}>
          This is what actually creates a student&apos;s recognition record
          (docs/PRD.md §5) — enrolling their login above does not; a student
          won&apos;t appear on the Students list until this step also runs.
        </p>
        <StudentFaceEnrollmentClient />
      </div>
    </main>
  );
}
