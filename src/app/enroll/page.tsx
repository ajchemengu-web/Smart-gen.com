import { cookies } from "next/headers";
import Link from "next/link";
import EnrollForm from "./EnrollForm";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";
import styles from "../form.module.css";

export const metadata = {
  title: "Enroll a user — Smart Gen",
};

export default async function EnrollPage() {
  const cookieStore = await cookies();
  const session = await decryptSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  // src/proxy.ts already guarantees an ADMIN session reaches this
  // page at all; session is only possibly null here in the instant
  // between that check and this render, which redirect() below
  // covers defensively rather than crashing on session.dashboard.
  const backHref = session ? `/dashboard/${session.dashboard}` : "/login";

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
        <EnrollForm />
        <p className={styles.footnote}>
          <Link href={backHref}>Back to dashboard</Link>
        </p>
      </div>
    </main>
  );
}
