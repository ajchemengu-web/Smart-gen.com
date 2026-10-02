import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import DashboardSidebarNav, { type SidebarSection } from "./DashboardSidebarNav";
import styles from "./DashboardSidebarLayout.module.css";

export default function DashboardSidebarLayout({
  roleLabel,
  sections,
  showEnrollLink = false,
  children,
}: {
  roleLabel: string;
  sections: SidebarSection[];
  // Account creation is the Original Admin's alone (see src/proxy.ts).
  showEnrollLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={styles.brandText}>
            <p className={styles.brand}>Smart Gen</p>
            <p className={styles.roleLabel}>{roleLabel}</p>
          </div>
        </div>
        <DashboardSidebarNav sections={sections} />
        <div className={styles.sidebarFooter}>
          {showEnrollLink && (
            <Link href="/enroll" className={styles.enrollLink}>
              Enroll a user
            </Link>
          )}
          <LogoutButton />
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.mainContainer}>{children}</div>
      </main>
    </div>
  );
}
