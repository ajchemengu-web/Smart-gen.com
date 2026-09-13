import DeanClient from "./DeanClient";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Dean of School — Smart Gen",
};

export default function DeanAdminDashboardPage() {
  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>Dean of School</h1>
          <LogoutButton />
        </div>
        <p className={shell.subtitle}>
          Department-scoped view: student roster and classification,
          units/lectures totals, the department&apos;s timetable, and
          venue camera access (docs/PRD.md §8). Filter by department,
          or leave it blank for a system-wide view.
        </p>
        <DeanClient />
      </div>
    </main>
  );
}
