"use client";

import { useEffect, useState } from "react";
import type { Lecturer } from "@/lib/api";
import { handleUnauthorized } from "@/lib/handleUnauthorized";
import tableStyles from "@/components/DataTable.module.css";
import styles from "./LecturerManagementClient.module.css";

// Register a lecturer's profile here, then use their lecturer_id as
// the "linked person ID" when enrolling their LECTURER login on the
// /enroll page — same two-step shape a student already has
// (docs/PRD.md §5, §6).
export default function LecturerManagementClient() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/lecturers", { cache: "no-store" });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError("Backend returned an error.");
        return;
      }

      setLecturers(await response.json());
      setError(null);
    } catch {
      setError("Could not reach the backend.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/lecturers", { cache: "no-store" });

        if (response.status === 401) {
          if (!cancelled) await handleUnauthorized();
          return;
        }

        if (!response.ok) {
          if (!cancelled) setError("Backend returned an error.");
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setLecturers(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not reach the backend.");
      }
    }

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(formData: FormData) {
    setSubmitting(true);

    const fields = {
      lecturer_id: String(formData.get("lecturer_id") ?? ""),
      full_name: String(formData.get("full_name") ?? ""),
      department: String(formData.get("department") ?? ""),
    };

    try {
      const response = await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Could not create the lecturer profile.");
        return;
      }

      setError(null);
    } finally {
      setSubmitting(false);
      load();
    }
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      <form action={handleCreate} className={styles.form}>
        <label className={styles.field}>
          <span>Lecturer ID</span>
          <input name="lecturer_id" required />
        </label>
        <label className={styles.field}>
          <span>Full name</span>
          <input name="full_name" required />
        </label>
        <label className={styles.field}>
          <span>Department</span>
          <input name="department" />
        </label>
        <div className={styles.submitRow}>
          <button type="submit" disabled={submitting} className={styles.submit}>
            {submitting ? "Adding…" : "Add lecturer"}
          </button>
        </div>
      </form>

      {lecturers.length === 0 ? (
        <p className={tableStyles.empty}>No lecturer profiles yet.</p>
      ) : (
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Lecturer ID</th>
              <th>Name</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {lecturers.map((lecturer) => (
              <tr key={lecturer.lecturer_id}>
                <td>{lecturer.lecturer_id}</td>
                <td>{lecturer.full_name}</td>
                <td>{lecturer.department ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
