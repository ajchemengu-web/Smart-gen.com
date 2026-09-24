import AdminOverviewClient from "@/components/AdminOverviewClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Original Admin — Smart Gen",
};

export default function OriginalAdminDashboardPage() {
  return (
    <>
      <h1>Overview</h1>
      <p className={shell.subtitle}>
        System-wide overview across SmartAccess: enrolled students, guests,
        and the access log (docs/PRD.md §8).
      </p>
      <AdminOverviewClient />
    </>
  );
}
