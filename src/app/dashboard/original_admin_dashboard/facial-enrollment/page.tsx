import StudentFaceEnrollmentClient from "@/components/StudentFaceEnrollmentClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Facial enrollment — Original Admin — Smart Gen",
};

export default function OriginalAdminFacialEnrollmentPage() {
  return (
    <>
      <h1>Facial enrollment</h1>
      <p className={shell.subtitle}>
        This is what actually creates a student&apos;s recognition record
        (docs/PRD.md §5) — enrolling their login on the Enroll page alone
        does not; a student won&apos;t appear on the Students list until
        this step also runs. Currently covers the STUDENT role only.
      </p>
      <StudentFaceEnrollmentClient />
    </>
  );
}
