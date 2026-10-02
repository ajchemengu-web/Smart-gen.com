"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/api";
import { handleUnauthorized } from "@/lib/handleUnauthorized";
import tableStyles from "@/components/DataTable.module.css";
import styles from "./AuditLogClient.module.css";

// Kept in step with the `action` names in the backend's
// src/api/main.py (audited(...) routes).
const ACTIONS = [
  "students.list",
  "guests.list",
  "access_logs.list",
  "unknowns.pending",
  "dean.roster",
  "lecturers.list",
  "lecturer.class_rolls",
  "student.data_summary",
  "watchlist.list",
  "watchlist.sightings",
  "watchlist.frequency",
  "investigations.list",
  "investigations.view",
  "scene.query",
  "alerts.pending",
  "audit.view",
];

function formatTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function AuditLogClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [action, setAction] = useState("");
  const [subject, setSubject] = useState("");
  const [since, setSince] = useState("");

  async function load(filters: {
    username: string;
    action: string;
    subject: string;
    since: string;
  }) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    query.set("limit", "200");

    try {
      const response = await fetch(`/api/audit?${query.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.detail ?? "Backend returned an error.");
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
        const response = await fetch("/api/audit?limit=200", {
          cache: "no-store",
        });

        if (response.status === 401) {
          if (!cancelled) await handleUnauthorized();
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          if (!cancelled) {
            setError(body?.detail ?? "Backend returned an error.");
          }
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

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          load({ username, action, subject, since });
        }}
      >
        <label className={styles.field}>
          <span>Account</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="username"
          />
        </label>
        <label className={styles.field}>
          <span>What was viewed</span>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="">Anything</option>
            {ACTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Record (e.g. target or case ID)</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Since</span>
          <input
            type="date"
            value={since}
            onChange={(event) => setSince(event.target.value)}
          />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.apply}>
            Apply filters
          </button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className={tableStyles.empty}>No matching entries.</p>
      ) : (
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Account</th>
              <th>Role</th>
              <th>Viewed</th>
              <th>Record</th>
              <th>Filters</th>
              <th>Times</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  {formatTime(entry.occurred_at)}
                  {entry.times > 1 && (
                    <>
                      <br />
                      <small>to {formatTime(entry.last_seen_at)}</small>
                    </>
                  )}
                </td>
                <td>{entry.username}</td>
                <td>
                  {entry.role ?? "—"}
                  {entry.admin_tier ? ` / ${entry.admin_tier}` : ""}
                  {entry.department ? ` (${entry.department})` : ""}
                </td>
                <td className={styles.mono}>{entry.action}</td>
                <td>{entry.subject_id || "—"}</td>
                <td className={styles.mono}>
                  {Object.keys(entry.params).length === 0
                    ? "—"
                    : Object.entries(entry.params)
                        .map(([key, value]) => `${key}=${value}`)
                        .join(", ")}
                </td>
                <td>{entry.times}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
