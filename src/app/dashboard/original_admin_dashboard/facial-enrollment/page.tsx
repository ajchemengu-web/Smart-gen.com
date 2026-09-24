import StudentRegistrationClient from "@/components/StudentRegistrationClient";
import StudentFaceEnrollmentClient from "@/components/StudentFaceEnrollmentClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Facial enrollment — Original Admin — Smart Gen",
};

export default function OriginalAdminFacialEnrollmentPage() {
  return (
    <>
      <h1>Register a student</h1>
      <p className={shell.subtitle}>
        Creates the record only (docs/PRD.md §5) — a student won&apos;t
        appear on the Students list until a face is attached, either by
        them self-enrolling from the SmartAttendance app (recommended:
        live-captured, liveness-checked) or by you directly below.
      </p>
      <StudentRegistrationClient />

      <h2>Or, enroll their face yourself</h2>
      <p className={shell.subtitle}>
        Uploads photos on the student&apos;s behalf instead of waiting for
        them to self-enroll — creates the record and the face in one step.
        Currently covers the STUDENT role only.
      </p>
      <StudentFaceEnrollmentClient />
    </>
  );
}
