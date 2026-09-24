"use client";

import { useState } from "react";
import styles from "./StudentRegistrationClient.module.css";

// Creates just the student record (docs/PRD.md §5) — no photo, no
// embedding. Pairs with the student self-enrolling their own face
// afterward from the SmartAttendance app (POST /me/enroll-face),
// using live-captured photos gated by the liveness check — no admin
// present to catch a spoofed photo the way there is when an admin
// does the enrollment directly below.
export default function StudentRegistrationClient() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const fields: Record<string, string> = {};
    for (const key of [
      "student_id",
      "full_name",
      "admission_number",
      "hostel",
      "room",
      "department",
      "course",
      "year",
      "semester",
    ]) {
      const value = formData.get(key);
      if (typeof value === "string" && value !== "") fields[key] = value;
    }

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail ?? "Could not register the student.");
        return;
      }

      setSuccess(
        `Registered ${data.full_name} (${data.student_id}) — they can now enroll their own face from the SmartAttendance app.`
      );
    } catch {
      setError("Could not reach the backend.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <form action={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Student ID</span>
          <input name="student_id" required />
        </label>
        <label className={styles.field}>
          <span>Full name</span>
          <input name="full_name" required />
        </label>
        <label className={styles.field}>
          <span>Admission number</span>
          <input name="admission_number" required />
        </label>
        <label className={styles.field}>
          <span>Hostel</span>
          <input name="hostel" required />
        </label>
        <label className={styles.field}>
          <span>Room</span>
          <input name="room" required />
        </label>
        <label className={styles.field}>
          <span>Department (optional)</span>
          <input name="department" />
        </label>
        <label className={styles.field}>
          <span>Course (optional)</span>
          <input name="course" />
        </label>
        <label className={styles.field}>
          <span>Year (optional)</span>
          <input name="year" type="number" min="1" />
        </label>
        <label className={styles.field}>
          <span>Semester (optional)</span>
          <input name="semester" type="number" min="1" max="2" />
        </label>
        <div className={styles.submitRow}>
          <button type="submit" disabled={submitting} className={styles.submit}>
            {submitting ? "Registering…" : "Register student"}
          </button>
        </div>
      </form>
    </div>
  );
}
