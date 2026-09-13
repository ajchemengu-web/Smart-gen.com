import Link from "next/link";
import AdminOverviewClient from "@/components/AdminOverviewClient";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Original Admin — Smart Gen",
};

export default function OriginalAdminDashboardPage() {
  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>Original Admin</h1>
          <div className={shell.headerActions}>
            <Link href="/enroll" className={shell.navLink}>
              Enroll a user
            </Link>
            <LogoutButton />
          </div>
        </div>
        <p className={shell.subtitle}>
          System-wide overview across SmartAccess. Full admin management
          and camera management control (docs/PRD.md §8) are not built
          yet — this shows the same live data the backend currently
          exposes: enrolled students, guests, and the access log.
        </p>
        <AdminOverviewClient />
      </div>
    </main>
  );
}
