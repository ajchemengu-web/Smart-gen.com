import AnalyticsClient from "@/components/AnalyticsClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Analytics — Original Admin — Smart Gen",
};

export default function OriginalAdminAnalyticsPage() {
  return (
    <>
      <h1>Analytics</h1>
      <p className={shell.subtitle}>
        False-positive rate (flagged by a Guard or Admin after review —
        docs/PRD.md §13) and movement by entrance/person type over the
        selected range.
      </p>
      <AnalyticsClient />
    </>
  );
}
