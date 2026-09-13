import GuardDashboardClient from "./GuardDashboardClient";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Guard Dashboard — Smart Gen",
};

export default function GuardDashboardPage() {
  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>Guard Dashboard</h1>
          <LogoutButton />
        </div>
        <p className={shell.subtitle}>
          Live queue of unknown guests awaiting Admit/Reject, and the
          recent access log. Refreshes automatically every 5 seconds.
        </p>
        <GuardDashboardClient />
      </div>
    </main>
  );
}
