"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DashboardSidebarLayout.module.css";

export type SidebarSection = {
  href: string;
  label: string;
  /** Root dashboard links only match exactly, so every sub-route
   * under them doesn't also light up this one. */
  exact?: boolean;
};

export default function DashboardSidebarNav({
  sections,
}: {
  sections: SidebarSection[];
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {sections.map((section) => {
        const isActive = section.exact
          ? pathname === section.href
          : pathname === section.href || pathname.startsWith(`${section.href}/`);

        return (
          <Link
            key={section.href}
            href={section.href}
            className={
              isActive
                ? `${styles.navItem} ${styles.navItemActive}`
                : styles.navItem
            }
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
