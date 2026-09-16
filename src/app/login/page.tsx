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
      </div>
    </main>
  );
}
