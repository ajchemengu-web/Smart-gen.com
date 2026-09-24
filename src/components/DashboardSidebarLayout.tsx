import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import DashboardSidebarNav, { type SidebarSection } from "./DashboardSidebarNav";
import styles from "./DashboardSidebarLayout.module.css";

export default function DashboardSidebarLayout({
  roleLabel,
  sections,
  children,
}: {
  roleLabel: string;
  sections: SidebarSection[];
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>Smart Gen</p>
        <p className={styles.roleLabel}>{roleLabel}</p>
        <DashboardSidebarNav sections={sections} />
        <div className={styles.sidebarFooter}>
          <Link href="/enroll" className={styles.enrollLink}>
            Enroll a user
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.mainContainer}>{children}</div>
      </main>
    </div>
  );
}
