import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import AdminSidebarNav from "./AdminSidebarNav";
import styles from "./AdminSidebarLayout.module.css";

export default function OriginalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>Smart Gen</p>
        <p className={styles.roleLabel}>Original Admin</p>
        <AdminSidebarNav />
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
