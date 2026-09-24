import TimetableClient from "./TimetableClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Timetabling Admin — Smart Gen",
};

export default function TimetablingAdminDashboardPage() {
  return (
    <>
      <h1>Timetable</h1>
      <p className={shell.subtitle}>
        Create, postpone, cancel, or delete timetable entries per course and
        year (docs/PRD.md §8). Pushing these into a student&apos;s own
        Schedule/Intraday view happens in the SmartAttendance app, not here.
      </p>
      <TimetableClient />
    </>
  );
}
