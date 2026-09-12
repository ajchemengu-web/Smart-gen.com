import Link from "next/link";
import EnrollForm from "./EnrollForm";
import styles from "../form.module.css";

export const metadata = {
  title: "Enroll a user — Smart Gen",
};

export default function EnrollPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>Enrollment</h1>
        <p className={styles.subtitle}>
          Create a login for a Student, Lecturer, Guard, Staff member, or
          Admin. Facial enrollment for recognition-based roles happens
          separately in the recognition engine — this only creates the
          login/dashboard-routing record.
        </p>
        <p className={styles.warning}>
          This page is not access-restricted yet — see the note at the top
          of src/services/auth_service.py in the recognition-engine repo.
          Treat it as an internal tool for now.
        </p>
        <EnrollForm />
        <p className={styles.footnote}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
