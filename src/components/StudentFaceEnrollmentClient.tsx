"use client";

import { useRef, useState } from "react";
import styles from "./StudentFaceEnrollmentClient.module.css";

// The step that actually creates the `students` table row (GET
// /students reads from it) — the /enroll page's login-only form
// deliberately does not do this (docs/PRD.md §5): a STUDENT account
// created there won't show up on the Students list until this step
// also runs. One or more reference photos are averaged into a
// single embedding by the recognition engine.
export default function StudentFaceEnrollmentClient() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const photos = formData
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (photos.length === 0) {
      setError("At least one reference photo is required.");
      setSubmitting(false);
      return;
    }

    const submission = new FormData();
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
      if (typeof value === "string" && value !== "") {
        submission.append(key, value);
      }
    }
    for (const photo of photos) {
      submission.append("files", photo);
    }

    try {
      const response = await fetch("/api/enroll/student-face", {
        method: "POST",
        body: submission,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail ?? "Could not enroll the student.");
        return;
      }

      setSuccess(
        `Enrolled ${data.full_name} (${data.student_id}) — ${data.samples_used} of ${
          data.samples_used + data.samples_skipped
        } photo(s) used.`
      );
      formRef.current?.reset();
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

      <form ref={formRef} action={handleSubmit} className={styles.form}>
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
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Reference photo(s)</span>
          <input name="photos" type="file" accept="image/*" multiple required />
          <p className={styles.note}>
            One clear, front-facing photo is enough; a few different
            angles/lighting conditions improve accuracy. Each photo must show
            exactly one face.
          </p>
        </label>
        <div className={styles.submitRow}>
          <button type="submit" disabled={submitting} className={styles.submit}>
            {submitting ? "Enrolling…" : "Enroll face"}
          </button>
        </div>
      </form>
    </div>
  );
}
