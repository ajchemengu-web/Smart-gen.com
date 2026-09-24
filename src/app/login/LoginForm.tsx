"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions/auth";
import styles from "../form.module.css";
import loginStyles from "./login.module.css";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>Username</span>
        <div className={loginStyles.inputWrap}>
          <span className={loginStyles.inputIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-4.14 0-7.5 2.35-7.5 5.25v1.5h15v-1.5c0-2.9-3.36-5.25-7.5-5.25Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input name="username" autoComplete="username" required />
        </div>
      </label>

      <label className={styles.field}>
        <span>Password</span>
        <div className={loginStyles.inputWrap}>
          <span className={loginStyles.inputIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 10.5V8a5 5 0 0 1 10 0v2.5h1a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1h1Zm2 0h6V8a3 3 0 0 0-6 0v2.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className={loginStyles.toggleVisibility}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M6.6 6.7C4.5 8.1 3 10 3 12c0 0 3.5 6 9 6 1.8 0 3.4-.6 4.7-1.5M9.9 4.6A9.8 9.8 0 0 1 12 4c5.5 0 9 6 9 6a13.6 13.6 0 0 1-2.4 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </div>
      </label>

      {state?.error && <p className={styles.error}>{state.error}</p>}
      {state?.message && <p className={styles.notice}>{state.message}</p>}

      <button disabled={pending} type="submit" className={styles.submit}>
        {pending ? (
          <>
            <span className={styles.spinner} aria-hidden="true" /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
