"use client";

import { useEffect, useState } from "react";
import type { TimetableEntry } from "@/lib/api";
import tableStyles from "@/components/DataTable.module.css";
import styles from "./timetable.module.css";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function statusClass(status: string) {
  if (status === "ON") return styles.statusOn;
  if (status === "POSTPONED") return styles.statusPostponed;
  return styles.statusCancelled;
}

export default function TimetableClient() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [courseFilter, setCourseFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (courseFilter) params.set("course", courseFilter);
    if (yearFilter) params.set("year", yearFilter);
    const query = params.toString();

    try {
      const response = await fetch(
        `/api/timetable${query ? `?${query}` : ""}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        setError("Backend returned an error.");
        return;
      }

      setEntries(await response.json());
      setError(null);
    } catch {
      setError("Could not reach the backend.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/timetable", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setError("Backend returned an error.");
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setEntries(data);
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
      course: String(formData.get("course") ?? ""),
      year: Number(formData.get("year")),
      day_of_week: String(formData.get("day_of_week") ?? ""),
      start_time: String(formData.get("start_time") ?? ""),
      end_time: String(formData.get("end_time") ?? ""),
      unit_name: String(formData.get("unit_name") ?? ""),
      facilitator: String(formData.get("facilitator") ?? ""),
      venue: String(formData.get("venue") ?? ""),
    };

    try {
      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Could not create the entry.");
        return;
      }

      setError(null);
    } finally {
      setSubmitting(false);
      load();
    }
  }

  async function handleStatusChange(id: number, status: string) {
    setBusyId(id);

    try {
      await fetch(`/api/timetable/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusyId(null);
      load();
    }
  }

  async function handleDelete(id: number) {
    setBusyId(id);

    try {
      await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      <section className={styles.section}>
        <h2>Add a timetable entry</h2>
        <form action={handleCreate} className={styles.form}>
          <label className={styles.field}>
            <span>Course</span>
            <input name="course" required />
          </label>
          <label className={styles.field}>
            <span>Year</span>
            <input name="year" type="number" min={1} max={8} required />
          </label>
          <label className={styles.field}>
            <span>Day</span>
            <select name="day_of_week" defaultValue="MONDAY">
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Start time</span>
            <input name="start_time" type="time" required />
          </label>
          <label className={styles.field}>
            <span>End time</span>
            <input name="end_time" type="time" required />
          </label>
          <label className={styles.field}>
            <span>Unit</span>
            <input name="unit_name" required />
          </label>
          <label className={styles.field}>
            <span>Facilitator</span>
            <input name="facilitator" required />
          </label>
          <label className={styles.field}>
            <span>Venue</span>
            <input name="venue" required />
          </label>
          <div className={styles.submitRow}>
            <button
              type="submit"
              disabled={submitting}
              className={styles.submit}
            >
              {submitting ? "Adding…" : "Add entry"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <h2>Timetable</h2>

        <div className={styles.filters}>
          <input
            placeholder="Filter by course"
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
          />
          <input
            placeholder="Filter by year"
            type="number"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          />
          <button
            type="button"
            className={styles.actionButton}
            onClick={load}
          >
            Apply filters
          </button>
        </div>

        {entries.length === 0 ? (
          <p className={tableStyles.empty}>No timetable entries yet.</p>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Course</th>
                <th>Yr</th>
                <th>Day</th>
                <th>Time</th>
                <th>Unit</th>
                <th>Facilitator</th>
                <th>Venue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.course}</td>
                  <td>{entry.year}</td>
                  <td>{entry.day_of_week}</td>
                  <td>
                    {entry.start_time}–{entry.end_time}
                  </td>
                  <td>{entry.unit_name}</td>
                  <td>{entry.facilitator}</td>
                  <td>{entry.venue}</td>
                  <td className={statusClass(entry.status)}>
                    {entry.status}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {entry.status !== "ON" && (
                        <button
                          disabled={busyId === entry.id}
                          onClick={() => handleStatusChange(entry.id, "ON")}
                          className={styles.actionButton}
                        >
                          Reactivate
                        </button>
                      )}
                      {entry.status !== "POSTPONED" && (
                        <button
                          disabled={busyId === entry.id}
                          onClick={() =>
                            handleStatusChange(entry.id, "POSTPONED")
                          }
                          className={styles.actionButton}
                        >
                          Postpone
                        </button>
                      )}
                      {entry.status !== "CANCELLED" && (
                        <button
                          disabled={busyId === entry.id}
                          onClick={() =>
                            handleStatusChange(entry.id, "CANCELLED")
                          }
                          className={styles.actionButton}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        disabled={busyId === entry.id}
                        onClick={() => handleDelete(entry.id)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
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
