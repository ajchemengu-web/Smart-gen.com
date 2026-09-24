import LecturerManagementClient from "@/components/LecturerManagementClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Lecturer profiles — Original Admin — Smart Gen",
};

export default function OriginalAdminLecturersPage() {
  return (
    <>
      <h1>Lecturer profiles</h1>
      <p className={shell.subtitle}>
        Register a lecturer&apos;s profile here first, then use their
        Lecturer ID as the &quot;linked person ID&quot; when enrolling their
        LECTURER login on the Enroll page — this is what lets SmartAttendance
        resolve them to their own units.
      </p>
      <LecturerManagementClient />
    </>
  );
}
