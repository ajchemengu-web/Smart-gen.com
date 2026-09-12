"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import styles from "../form.module.css";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>Username</span>
        <input name="username" autoComplete="username" required />
      </label>

      <label className={styles.field}>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {state?.error && <p className={styles.error}>{state.error}</p>}
      {state?.message && <p className={styles.notice}>{state.message}</p>}

      <button disabled={pending} type="submit" className={styles.submit}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
