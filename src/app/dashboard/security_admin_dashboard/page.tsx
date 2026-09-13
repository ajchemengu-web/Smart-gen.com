import Link from "next/link";
import AdminOverviewClient from "@/components/AdminOverviewClient";
import CameraManagementClient from "@/components/CameraManagementClient";
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
          <div className={shell.headerActions}>
            <Link
              href="/dashboard/security_admin_dashboard/investigations"
              className={shell.navLink}
            >
              Target tracking &amp; investigations
            </Link>
            <Link href="/enroll" className={shell.navLink}>
              Enroll a user
            </Link>
            <LogoutButton />
          </div>
        </div>
        <p className={shell.subtitle}>
          Oversight for SmartAccess: enrolled students, guests, and the
          access log, plus camera status and configuration within
          SmartAccess (docs/PRD.md §8) — provisioning and removing a
          camera stays with the Original Admin.
        </p>
        <AdminOverviewClient />
        <h2>Camera management</h2>
        <CameraManagementClient canCreate={false} canDelete={false} />
      </div>
    </main>
  );
}
