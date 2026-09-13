import LoginForm from "./LoginForm";
import styles from "../form.module.css";

export const metadata = {
  title: "Sign in — Smart Gen",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>Smart Gen</h1>
        <p className={styles.subtitle}>
          Sign in with your admin or guard credentials. Your account
          determines which dashboard you land on.
        </p>
        <LoginForm />
        <p className={styles.footnote}>
          Admins can enroll new users (Student, Lecturer, Guard, Staff,
          or Admin) from their dashboard after signing in.
        </p>
      </div>
    </main>
  );
}
