import AdminOverviewClient from "@/components/AdminOverviewClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Security Admin — Smart Gen",
};

export default function SecurityAdminDashboardPage() {
  return (
    <>
      <h1>Overview</h1>
      <p className={shell.subtitle}>
        Oversight for SmartAccess: enrolled students, guests, and the access
        log (docs/PRD.md §8).
      </p>
      <AdminOverviewClient />
    </>
  );
}
