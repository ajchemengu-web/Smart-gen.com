import TimetableClient from "./TimetableClient";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Timetabling Admin — Smart Gen",
};

export default function TimetablingAdminDashboardPage() {
  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>Directorate of Timetabling</h1>
          <LogoutButton />
        </div>
        <p className={shell.subtitle}>
          Create, postpone, cancel, or delete timetable entries per
          course and year (docs/PRD.md §8). Pushing these into a
          student&apos;s own Schedule/Intraday view happens in the
          SmartAttendance app, not here.
        </p>
        <TimetableClient />
      </div>
    </main>
  );
}
