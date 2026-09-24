import LoginForm from "./LoginForm";
import styles from "../form.module.css";
import loginStyles from "./login.module.css";

export const metadata = {
  title: "Sign in — Smart Gen",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={loginStyles.badge} aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="m9 12 2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className={loginStyles.heading}>Smart Gen</h1>
        <p className={`${styles.subtitle} ${loginStyles.subtitle}`}>
          Sign in with your admin or guard credentials. Your account
          determines which dashboard you land on.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
