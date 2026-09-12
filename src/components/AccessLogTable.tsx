import type { AccessLogEntry } from "@/lib/api";
import styles from "./DataTable.module.css";

export default function AccessLogTable({ logs }: { logs: AccessLogEntry[] }) {
  if (logs.length === 0) {
    return <p className={styles.empty}>No access events yet.</p>;
  }

  return (
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
        {logs.map((log) => (
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
  );
}
