import GuardDashboardClient from "./GuardDashboardClient";
import styles from "./guard.module.css";

export const metadata = {
  title: "Guard Dashboard — Smart Gen",
};

export default function GuardDashboardPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1>Guard Dashboard</h1>
        <p className={styles.subtitle}>
          Live queue of unknown guests awaiting Admit/Reject, and the
          recent access log. Refreshes automatically every 5 seconds.
        </p>
        <GuardDashboardClient />
      </div>
    </main>
  );
}
