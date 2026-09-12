"use client";

import { useEffect, useState } from "react";
import type { AccessLogEntry, Guest, Student } from "@/lib/api";
import AccessLogTable from "@/components/AccessLogTable";
import styles from "./AdminOverviewClient.module.css";
import tableStyles from "./DataTable.module.css";

const POLL_INTERVAL_MS = 8000;
const MAX_LOG_ROWS_SHOWN = 10;

export default function AdminOverviewClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [studentsRes, guestsRes, logsRes] = await Promise.all([
          fetch("/api/students", { cache: "no-store" }),
          fetch("/api/guests", { cache: "no-store" }),
          fetch("/api/access-logs", { cache: "no-store" }),
        ]);

        if (!studentsRes.ok || !guestsRes.ok || !logsRes.ok) {
          if (!cancelled) setError("Backend returned an error. Retrying…");
          return;
        }

        const [studentsData, guestsData, logsData] = await Promise.all([
          studentsRes.json(),
          guestsRes.json(),
          logsRes.json(),
        ]);

        if (!cancelled) {
          setStudents(studentsData ?? []);
          setGuests(guestsData ?? []);
          setLogs(logsData ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not reach the backend. Retrying…");
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeGuests = guests.filter(
    (guest) =>
      guest.status === "AG" &&
      guest.expires_at != null &&
      new Date(guest.expires_at) > new Date()
  );

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{students.length}</span>
          <span className={styles.statLabel}>Enrolled students</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{activeGuests.length}</span>
          <span className={styles.statLabel}>Active admitted guests</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{logs.length}</span>
          <span className={styles.statLabel}>Recent access events</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2>Recent Access Log</h2>
        <AccessLogTable logs={logs.slice(0, MAX_LOG_ROWS_SHOWN)} />
      </section>

      <section className={styles.section}>
        <h2>Students ({students.length})</h2>
        {students.length === 0 ? (
          <p className={tableStyles.empty}>No students enrolled yet.</p>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Admission #</th>
                <th>Hostel</th>
                <th>Room</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_id}>
                  <td>{student.student_id}</td>
                  <td>{student.full_name}</td>
                  <td>{student.admission_number}</td>
                  <td>{student.hostel}</td>
                  <td>{student.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section}>
        <h2>Guests</h2>
        {guests.length === 0 ? (
          <p className={tableStyles.empty}>No guest records yet.</p>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Guest ID</th>
                <th>Status</th>
                <th>Admitted By</th>
                <th>Admitted At</th>
                <th>Expires At</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.guest_id}>
                  <td>{guest.guest_id}</td>
                  <td>{guest.status}</td>
                  <td>{guest.admitted_by ?? "—"}</td>
                  <td>
                    {guest.admitted_at
                      ? new Date(guest.admitted_at).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    {guest.expires_at
                      ? new Date(guest.expires_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
