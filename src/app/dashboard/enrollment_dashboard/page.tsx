import EnrollForm from "../../enroll/EnrollForm";
import LogoutButton from "@/components/LogoutButton";
import shell from "@/components/DashboardShell.module.css";
import formStyles from "../../form.module.css";

export const metadata = {
  title: "Enrollment Dashboard — Smart Gen",
};

// The Temporary Admin's *only* capability (docs/PRD.md §8): data
// entry / facial-enrollment help, nothing else. Their access
// expires once an Original Admin marks their task complete
// (POST /admin/temporary-admins/{username}/complete in
// Alternative_Identifier) — this dashboard has no self-service way
// to end that early, by design.
export default function EnrollmentDashboardPage() {
  return (
    <main className={shell.page}>
      <div className={shell.container}>
        <div className={shell.headerRow}>
          <h1>Enrollment Dashboard</h1>
          <LogoutButton />
        </div>
        <p className={shell.subtitle}>
          Create a login for a Student, Lecturer, Guard, Staff member, or
          Admin. Facial enrollment for recognition-based roles happens
          separately in the recognition engine — this only creates the
          login/dashboard-routing record. Your access here expires once
          an Original Admin marks your task complete.
        </p>
        <div className={formStyles.card}>
          <EnrollForm />
        </div>
      </div>
    </main>
  );
}
