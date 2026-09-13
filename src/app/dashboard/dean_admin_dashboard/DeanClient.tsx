"use client";

import { useEffect, useState } from "react";
import type {
  DeanRosterEntry,
  DeanSummary,
  TimetableEntry,
} from "@/lib/api";
import tableStyles from "@/components/DataTable.module.css";
import styles from "./dean.module.css";

export default function DeanClient() {
  const [department, setDepartment] = useState("");
  const [appliedDepartment, setAppliedDepartment] = useState("");
  const [summary, setSummary] = useState<DeanSummary | null>(null);
  const [roster, setRoster] = useState<DeanRosterEntry[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(dept: string) {
    const query = dept ? `?department=${encodeURIComponent(dept)}` : "";

    try {
      const [summaryRes, rosterRes, timetableRes] = await Promise.all([
        fetch(`/api/dean/summary${query}`, { cache: "no-store" }),
        fetch(`/api/dean/roster${query}`, { cache: "no-store" }),
        fetch(`/api/timetable${query}`, { cache: "no-store" }),
      ]);

      if (!summaryRes.ok || !rosterRes.ok || !timetableRes.ok) {
        setError("Backend returned an error.");
        return;
      }

      setSummary(await summaryRes.json());
      setRoster(await rosterRes.json());
      setTimetable(await timetableRes.json());
      setError(null);
    } catch {
      setError("Could not reach the backend.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const [summaryRes, rosterRes, timetableRes] = await Promise.all([
          fetch("/api/dean/summary", { cache: "no-store" }),
          fetch("/api/dean/roster", { cache: "no-store" }),
          fetch("/api/timetable", { cache: "no-store" }),
        ]);

        if (!summaryRes.ok || !rosterRes.ok || !timetableRes.ok) {
          if (!cancelled) setError("Backend returned an error.");
          return;
        }

        const [summaryData, rosterData, timetableData] = await Promise.all([
          summaryRes.json(),
          rosterRes.json(),
          timetableRes.json(),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setRoster(rosterData);
          setTimetable(timetableData);
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

  function handleApplyFilter() {
    setAppliedDepartment(department);
    load(department);
  }

  function handleClearFilter() {
    setDepartment("");
    setAppliedDepartment("");
    load("");
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      <section className={styles.section}>
        <h2>Department</h2>
        <div className={styles.filters}>
          <input
            placeholder="e.g. School of Computing"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
          <button
            type="button"
            className={styles.filterButton}
            onClick={handleApplyFilter}
          >
            View department
          </button>
          {appliedDepartment && (
            <button
              type="button"
              className={styles.filterButton}
              onClick={handleClearFilter}
            >
              View all departments
            </button>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2>
          {appliedDepartment
            ? `${appliedDepartment} — overview`
            : "All departments — overview"}
        </h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Total students</p>
            <p className={styles.cardValue}>
              {summary?.total_students ?? "—"}
            </p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Units taught</p>
            <p className={styles.cardValue}>{summary?.total_units ?? "—"}</p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Active lectures</p>
            <p className={styles.cardValue}>
              {summary?.total_active_lectures ?? "—"}
            </p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Timetable entries</p>
            <p className={styles.cardValue}>
              {summary?.total_timetable_entries ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Student roster by classification</h2>
        {!summary || summary.roster_by_classification.length === 0 ? (
          <p className={tableStyles.empty}>No classified students yet.</p>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Course</th>
                <th>Year</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {summary.roster_by_classification.map((row, index) => (
                <tr key={`${row.course}-${row.year}-${index}`}>
                  <td>{row.course ?? "Unclassified"}</td>
                  <td>{row.year ?? "—"}</td>
                  <td>{row.student_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section}>
        <h2>Roster</h2>
        {roster.length === 0 ? (
          <p className={tableStyles.empty}>No students to show.</p>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Admission No.</th>
                <th>Department</th>
                <th>Course</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => (
                <tr key={student.student_id}>
                  <td>{student.student_id}</td>
                  <td>{student.full_name}</td>
                  <td>{student.admission_number}</td>
                  <td>{student.department ?? "—"}</td>
                  <td>{student.course ?? "—"}</td>
                  <td>{student.year ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section}>
        <h2>Department timetable</h2>
        {timetable.length === 0 ? (
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
              </tr>
            </thead>
            <tbody>
              {timetable.map((entry) => (
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
                  <td>{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className={styles.scope}>
        Class logs (per-lecture attendance) and venue camera access are
        part of this dashboard&apos;s scope per docs/PRD.md §8, but need
        the SmartAttendance classroom-camera pipeline and camera
        management, neither of which exist yet — not shown here.
      </p>
    </div>
  );
}
