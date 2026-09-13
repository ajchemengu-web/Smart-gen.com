import { logoutAction } from "@/app/actions/auth";
import styles from "./LogoutButton.module.css";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className={styles.button}>
        Sign out
      </button>
    </form>
  );
}
