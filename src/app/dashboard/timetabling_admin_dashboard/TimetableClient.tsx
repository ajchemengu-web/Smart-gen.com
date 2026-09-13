"use client";

import { useEffect, useState } from "react";
import type { Lecturer, TimetableEntry, Unit } from "@/lib/api";
import { handleUnauthorized } from "@/lib/handleUnauthorized";
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

function unitLabel(unit: Unit) {
  return `${unit.unit_code} — ${unit.unit_name} (${unit.course} Yr${unit.year} Sem${unit.semester})`;
}

export default function TimetableClient() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyUnitId, setBusyUnitId] = useState<number | null>(null);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  async function loadUnits() {
    try {
      const response = await fetch("/api/units", { cache: "no-store" });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setUnitError("Backend returned an error.");
        return;
      }

      setUnits(await response.json());
    } catch {
      setUnitError("Could not reach the backend.");
    }
  }

  async function loadLecturers() {
    try {
      const response = await fetch("/api/lecturers", { cache: "no-store" });
      if (response.ok) {
        setLecturers(await response.json());
      }
    } catch {
      // Non-fatal — the reassignment select just shows no options.
    }
  }

  async function load() {
    const params = new URLSearchParams();
    if (departmentFilter) params.set("department", departmentFilter);
    if (courseFilter) params.set("course", courseFilter);
    if (yearFilter) params.set("year", yearFilter);
    if (semesterFilter) params.set("semester", semesterFilter);
    const query = params.toString();

    try {
      const response = await fetch(
        `/api/timetable${query ? `?${query}` : ""}`,
        { cache: "no-store" }
      );

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

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
          setEntries(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not reach the backend.");
      }
    }

    initialLoad();
    loadUnits();
    loadLecturers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateUnit(formData: FormData) {
    setCreatingUnit(true);

    const fields = {
      unit_code: String(formData.get("unit_code") ?? ""),
      unit_name: String(formData.get("unit_name") ?? ""),
      department: String(formData.get("department") ?? ""),
      course: String(formData.get("course") ?? ""),
      year: Number(formData.get("year")),
      semester: Number(formData.get("semester")),
    };

    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setUnitError(data.detail ?? "Could not create the unit.");
        return;
      }

      setUnitError(null);
    } finally {
      setCreatingUnit(false);
      loadUnits();
    }
  }

  async function handleReassignLecturer(unitId: number, lecturerId: string) {
    setBusyUnitId(unitId);

    try {
      await fetch(`/api/units/${unitId}/lecturer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecturer_id: lecturerId || null }),
      });
    } finally {
      setBusyUnitId(null);
      loadUnits();
      load();
    }
  }

  async function handleCreate(formData: FormData) {
    setSubmitting(true);

    const fields = {
      unit_id: Number(formData.get("unit_id")),
      day_of_week: String(formData.get("day_of_week") ?? ""),
      start_time: String(formData.get("start_time") ?? ""),
      end_time: String(formData.get("end_time") ?? ""),
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

  function lecturerName(lecturerId: string | null) {
    if (!lecturerId) return "Unclaimed";
    return (
      lecturers.find((lecturer) => lecturer.lecturer_id === lecturerId)
        ?.full_name ?? lecturerId
    );
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}
      {unitError && <p className={styles.banner}>{unitError}</p>}

      <section className={styles.section}>
        <h2>Units</h2>
        <p className={styles.helpText}>
          Create a unit once (department/course/year/semester); a
          lecturer then self-registers from the SmartAttendance app the
          units they teach, which is what fills in the lecturer below —
          you can also assign or reassign one directly here to correct
          a mistake or cover a unit before it&apos;s claimed.
        </p>
        <form action={handleCreateUnit} className={styles.form}>
          <label className={styles.field}>
            <span>Unit code</span>
            <input name="unit_code" placeholder="SCO 104" required />
          </label>
          <label className={styles.field}>
            <span>Unit name</span>
            <input name="unit_name" required />
          </label>
          <label className={styles.field}>
            <span>Department</span>
            <input name="department" />
          </label>
          <label className={styles.field}>
            <span>Course</span>
            <input name="course" required />
          </label>
          <label className={styles.field}>
            <span>Year</span>
            <input name="year" type="number" min={1} max={8} required />
          </label>
          <label className={styles.field}>
            <span>Semester</span>
            <input name="semester" type="number" min={1} max={2} required />
          </label>
          <div className={styles.submitRow}>
            <button
              type="submit"
              disabled={creatingUnit}
              className={styles.submit}
            >
              {creatingUnit ? "Adding…" : "Add unit"}
            </button>
          </div>
        </form>

        {units.length === 0 ? (
          <p className={tableStyles.empty}>No units yet.</p>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Course</th>
                <th>Yr</th>
                <th>Sem</th>
                <th>Lecturer</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td>{unit.unit_code}</td>
                  <td>{unit.unit_name}</td>
                  <td>{unit.department ?? "—"}</td>
                  <td>{unit.course}</td>
                  <td>{unit.year}</td>
                  <td>{unit.semester}</td>
                  <td>
                    <select
                      value={unit.lecturer_id ?? ""}
                      disabled={busyUnitId === unit.id}
                      onChange={(event) =>
                        handleReassignLecturer(unit.id, event.target.value)
                      }
                    >
                      <option value="">Unclaimed</option>
                      {lecturers.map((lecturer) => (
                        <option
                          key={lecturer.lecturer_id}
                          value={lecturer.lecturer_id}
                        >
                          {lecturer.full_name}
                        </option>
                      ))}
                      {unit.lecturer_id &&
                        !lecturers.some(
                          (lecturer) =>
                            lecturer.lecturer_id === unit.lecturer_id
                        ) && (
                          <option value={unit.lecturer_id}>
                            {lecturerName(unit.lecturer_id)}
                          </option>
                        )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section}>
        <h2>Add a timetable entry</h2>
        <p className={styles.helpText}>
          Pick a unit — its department/course/year/semester and
          lecturer come from the unit itself, so they can&apos;t drift
          out of sync or be typed in wrong (docs/PRD.md §6). Create the
          unit above first if it isn&apos;t listed yet.
        </p>
        <form action={handleCreate} className={styles.form}>
          <label className={styles.field}>
            <span>Unit</span>
            <select name="unit_id" required disabled={units.length === 0}>
              {units.length === 0 && <option value="">No units yet</option>}
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
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
            <span>Venue</span>
            <input name="venue" required />
          </label>
          <div className={styles.submitRow}>
            <button
              type="submit"
              disabled={submitting || units.length === 0}
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
            placeholder="Filter by department"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          />
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
          <input
            placeholder="Filter by semester"
            type="number"
            min={1}
            max={2}
            value={semesterFilter}
            onChange={(event) => setSemesterFilter(event.target.value)}
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
                <th>Department</th>
                <th>Course</th>
                <th>Yr</th>
                <th>Sem</th>
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
                  <td>{entry.department ?? "—"}</td>
                  <td>{entry.course}</td>
                  <td>{entry.year}</td>
                  <td>{entry.semester ?? "—"}</td>
                  <td>{entry.day_of_week}</td>
                  <td>
                    {entry.start_time}–{entry.end_time}
                  </td>
                  <td>
                    {entry.unit_code ? `${entry.unit_code} — ` : ""}
                    {entry.unit_name}
                  </td>
                  <td>{entry.facilitator ?? "Unassigned"}</td>
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
