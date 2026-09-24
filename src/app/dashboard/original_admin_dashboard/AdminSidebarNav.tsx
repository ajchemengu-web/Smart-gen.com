"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebarLayout.module.css";

const SECTIONS = [
  { href: "/dashboard/original_admin_dashboard", label: "Overview" },
  {
    href: "/dashboard/original_admin_dashboard/analytics",
    label: "Analytics",
  },
  {
    href: "/dashboard/original_admin_dashboard/camera-management",
    label: "Camera management",
  },
  {
    href: "/dashboard/original_admin_dashboard/lecturers",
    label: "Lecturer profiles",
  },
] as const;

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {SECTIONS.map((section) => {
        const isActive =
          section.href === "/dashboard/original_admin_dashboard"
            ? pathname === section.href
            : pathname.startsWith(section.href);

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
