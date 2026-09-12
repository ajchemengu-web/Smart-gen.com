"use client";

import { useActionState, useState } from "react";
import { enrollAction } from "@/app/actions/auth";
import styles from "../form.module.css";

const ROLES = ["STUDENT", "LECTURER", "GUARD", "STAFF", "ADMIN"] as const;

const ADMIN_TIERS = [
  "ORIGINAL",
  "SECURITY",
  "TIMETABLING",
  "DEAN",
  "TEMPORARY",
] as const;

export default function EnrollForm() {
  const [state, action, pending] = useActionState(enrollAction, undefined);
  const [role, setRole] = useState<string>("STUDENT");

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>Username</span>
        <input name="username" autoComplete="off" required />
      </label>

      <label className={styles.field}>
        <span>Temporary password</span>
        <input name="password" type="password" required />
      </label>

      <label className={styles.field}>
        <span>Email</span>
        <input name="email" type="email" required />
      </label>

      <label className={styles.field}>
        <span>Role</span>
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {role === "ADMIN" && (
        <label className={styles.field}>
          <span>Admin tier</span>
          <select name="admin_tier" defaultValue="">
            <option value="" disabled>
              Select a tier
            </option>
            {ADMIN_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
      )}

      {(role === "STUDENT" ||
        role === "LECTURER" ||
        role === "GUARD" ||
        role === "STAFF") && (
        <label className={styles.field}>
          <span>Linked person ID (optional)</span>
          <input
            name="linked_person_id"
            placeholder="e.g. admission number or staff ID"
          />
        </label>
      )}

      {state?.error && <p className={styles.error}>{state.error}</p>}
      {state?.message && <p className={styles.notice}>{state.message}</p>}

      <button disabled={pending} type="submit" className={styles.submit}>
        {pending ? "Enrolling…" : "Enroll"}
      </button>
    </form>
  );
}
