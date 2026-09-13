import { notFound } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import styles from "../../form.module.css";

const DASHBOARDS: Record<
  string,
  { title: string; description: string }
> = {
  // original_admin_dashboard and security_admin_dashboard have real
  // implementations at src/app/dashboard/original_admin_dashboard/
  // and .../security_admin_dashboard/, which Next.js resolves in
  // preference to this dynamic [slug] route for those exact paths —
  // intentionally not listed here.
  timetabling_admin_dashboard: {
    title: "Directorate of Timetabling",
    description:
      "Create, update, and cancel timetables per course and year.",
  },
  dean_admin_dashboard: {
    title: "Dean of School",
    description:
      "Class logs, venue cameras, student rosters, department " +
      "lecture/unit totals, department timetables.",
  },
  enrollment_dashboard: {
    title: "Enrollment (Temporary Admin)",
    description:
      "Data entry and facial enrollment only. Access expires once " +
      "the assigned task is marked complete.",
  },
  // guard_dashboard has a real implementation at
  // src/app/dashboard/guard_dashboard/page.tsx, which Next.js
  // resolves in preference to this dynamic [slug] route for that
  // exact path — it is intentionally not listed here.
};

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
