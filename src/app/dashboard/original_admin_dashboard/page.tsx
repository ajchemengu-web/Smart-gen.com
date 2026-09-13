import Link from "next/link";
import AdminOverviewClient from "@/components/AdminOverviewClient";
import CameraManagementClient from "@/components/CameraManagementClient";
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
          System-wide overview across SmartAccess: enrolled students,
          guests, and the access log, plus full camera management
          control (docs/PRD.md §8) — provision, configure, and remove
          any checkpoint or classroom camera.
        </p>
        <AdminOverviewClient />
        <h2>Camera management</h2>
        <CameraManagementClient canCreate canDelete />
      </div>
    </main>
  );
}
