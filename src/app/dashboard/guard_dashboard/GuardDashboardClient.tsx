"use client";

import { useEffect, useState } from "react";
import type { AccessLogEntry, PendingUnknown } from "@/lib/api";
import styles from "./guard.module.css";

// Caps per docs/PRD.md §6.2: a guard should never face an unbounded
// wall of faces. 4 unknown guests shown at a time; 10 most recent
// access-log rows stand in for "verified faces" (there is no live
// video feed to the browser yet, just the access log the backend
// already writes).
const MAX_UNKNOWN_SHOWN = 4;
const MAX_LOG_ROWS_SHOWN = 10;

const POLL_INTERVAL_MS = 5000;

export default function GuardDashboardClient() {
  const [pending, setPending] = useState<PendingUnknown[]>([]);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [pendingResponse, logsResponse] = await Promise.all([
          fetch("/api/guard/pending", { cache: "no-store" }),
          fetch("/api/access-logs", { cache: "no-store" }),
        ]);

        if (!pendingResponse.ok || !logsResponse.ok) {
          if (!cancelled) setError("Backend returned an error. Retrying…");
          return;
        }

        const pendingData = await pendingResponse.json();
        const logsData = await logsResponse.json();

        if (!cancelled) {
          setPending(pendingData.unknown_persons ?? []);
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
  }, [refreshTick]);

  async function handleDecision(unknownId: string, action: "admit" | "reject") {
    setBusyId(unknownId);

    try {
      await fetch(`/api/guard/${action}/${encodeURIComponent(unknownId)}`, {
        method: "POST",
      });
    } finally {
      setBusyId(null);
      setRefreshTick((tick) => tick + 1);
    }
  }

  const shownPending = pending.slice(0, MAX_UNKNOWN_SHOWN);
  const shownLogs = logs.slice(0, MAX_LOG_ROWS_SHOWN);

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      <section className={styles.section}>
        <h2>
          Unknown Guests — Pending Review
          {pending.length > MAX_UNKNOWN_SHOWN && (
            <span className={styles.countBadge}>
              {pending.length} total
            </span>
          )}
        </h2>

        {shownPending.length === 0 ? (
          <p className={styles.empty}>No unknown guests waiting.</p>
        ) : (
          <ul className={styles.queue}>
            {shownPending.map((person) => (
              <li key={person.unknown_id} className={styles.queueItem}>
                <div>
                  <strong>{person.unknown_id}</strong>
                  <span className={styles.meta}>
                    detected {new Date(person.detected_at).toLocaleString()}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button
                    disabled={busyId === person.unknown_id}
                    onClick={() => handleDecision(person.unknown_id, "admit")}
                    className={styles.admit}
                  >
                    Admit
                  </button>
                  <button
                    disabled={busyId === person.unknown_id}
                    onClick={() => handleDecision(person.unknown_id, "reject")}
                    className={styles.reject}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>Recent Access Log</h2>

        {shownLogs.length === 0 ? (
          <p className={styles.empty}>No access events yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Identifier</th>
                <th>Decision</th>
                <th>Score</th>
                <th>Liveness</th>
              </tr>
            </thead>
            <tbody>
              {shownLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td>{log.person_type}</td>
                  <td>{log.person_identifier ?? "—"}</td>
                  <td>{log.decision ?? "—"}</td>
                  <td>
                    {log.recognition_score != null
                      ? log.recognition_score.toFixed(2)
                      : "—"}
                  </td>
                  <td>
                    {log.liveness_score != null
                      ? log.liveness_score.toFixed(2)
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
