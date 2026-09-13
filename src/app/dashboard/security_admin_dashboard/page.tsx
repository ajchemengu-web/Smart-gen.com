import AdminOverviewClient from "@/components/AdminOverviewClient";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Security Admin — Smart Gen",
};

export default function SecurityAdminDashboardPage() {
  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>Security Admin</h1>
          <LogoutButton />
        </div>
        <p className={shell.subtitle}>
          Oversight for SmartAccess. Camera status and configuration
          (docs/PRD.md §8) are not built yet — this shows the same live
          data the backend currently exposes: enrolled students, guests,
          and the access log.
        </p>
        <AdminOverviewClient />
      </div>
    </main>
  );
}
