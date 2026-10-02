import DeanClient from "./DeanClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Dean of School — Smart Gen",
};

export default function DeanAdminDashboardPage() {
  return (
    <>
      <h1>Overview</h1>
      <p className={shell.subtitle}>
        Your department&apos;s student roster and classification,
        units/lectures totals, timetable, and venue cameras (docs/PRD.md
        §8). The server limits this view to the department on your
        account.
      </p>
      <DeanClient />
    </>
  );
}
