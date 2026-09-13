import { notFound } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import styles from "../../form.module.css";

// Every dashboard slug Alternative_Identifier's auth_service.
// resolve_dashboard() can hand back now has a real implementation
// under src/app/dashboard/<slug>/, which Next.js resolves in
// preference to this dynamic [slug] route for those exact paths:
// original_admin_dashboard, security_admin_dashboard,
// timetabling_admin_dashboard, dean_admin_dashboard,
// enrollment_dashboard, guard_dashboard. This map exists only as a
// fallback for any future/unmapped dashboard slug.
const DASHBOARDS: Record<
  string,
  { title: string; description: string }
> = {};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dashboard = DASHBOARDS[slug];

  if (!dashboard) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>{dashboard.title}</h1>
        <p className={styles.subtitle}>{dashboard.description}</p>
        <p className={styles.warning}>
          Placeholder — this dashboard&apos;s real views (per docs/PRD.md
          §8) are not built yet. You landed here because your login
          resolved to <code>{slug}</code>.
        </p>
        <LogoutButton />
      </div>
    </main>
  );
}
