import Link from "next/link";
import SmartAccessClient from "./SmartAccessClient";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "SmartAccess Investigations — Smart Gen",
};

export default function SmartAccessInvestigationsPage() {
  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>SmartAccess: Target Tracking &amp; Investigations</h1>
          <div className={shell.headerActions}>
            <Link
              href="/dashboard/security_admin_dashboard"
              className={shell.navLink}
            >
              Back to Security Admin
            </Link>
            <LogoutButton />
          </div>
        </div>
        <p className={shell.subtitle}>
          Register a person of interest and every live sighting at a
          checkpoint is logged automatically (docs/PRD.md §6.3a) — a
          target flag overrides normal admission, even for an
          otherwise-legitimate member. Investigations are lightweight
          case files, optionally linked to one target, for building a
          record over time.
        </p>
        <SmartAccessClient />
      </div>
    </main>
  );
}
