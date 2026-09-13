"use client";

import { useState } from "react";
import type { AccessLogEntry } from "@/lib/api";
import tableStyles from "./DataTable.module.css";
import styles from "./AccessLogTable.module.css";

// Flagging is available to whoever notices a match was wrong on
// review (a Guard or Admin — the backend allows both), not
// automatic: there's no ground truth in the data itself to infer a
// false positive from (docs/PRD.md §13's analytics_service.py has
// the full rationale).
export default function AccessLogTable({ logs }: { logs: AccessLogEntry[] }) {
  const [flaggingId, setFlaggingId] = useState<number | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<Record<number, string>>({});

  async function handleConfirmFlag(id: number) {
    setBusyId(id);

    try {
      const response = await fetch(`/api/access-logs/${id}/false-positive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonDraft }),
      });

      if (response.ok) {
        setFlagged((prev) => ({ ...prev, [id]: reasonDraft }));
      }
    } finally {
      setBusyId(null);
      setFlaggingId(null);
      setReasonDraft("");
    }
  }

  if (logs.length === 0) {
    return <p className={tableStyles.empty}>No access events yet.</p>;
  }

  return (
    <table className={tableStyles.table}>
      <thead>
        <tr>
          <th>Time</th>
          <th>Type</th>
          <th>Identifier</th>
          <th>Decision</th>
          <th>Score</th>
          <th>Liveness</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => {
          const isFlagged = log.false_positive || log.id in flagged;
          const reason = flagged[log.id] ?? log.false_positive_reason;

          return (
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
              <td>
                {isFlagged ? (
                  <span
                    className={styles.flaggedBadge}
                    title={reason ?? undefined}
                  >
                    Flagged false positive
                  </span>
                ) : log.decision !== "VERIFIED" ? (
                  "—"
                ) : flaggingId === log.id ? (
                  <div className={styles.flagForm}>
                    <input
                      placeholder="Reason"
                      value={reasonDraft}
                      onChange={(event) => setReasonDraft(event.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.actionButton}
                      disabled={busyId === log.id || !reasonDraft.trim()}
                      onClick={() => handleConfirmFlag(log.id)}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => {
                        setFlaggingId(null);
                        setReasonDraft("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setFlaggingId(log.id)}
                  >
                    Flag false positive
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
