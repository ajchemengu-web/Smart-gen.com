"use client";

import { useEffect, useState } from "react";
import type { AnalyticsSummary } from "@/lib/api";
import { handleUnauthorized } from "@/lib/handleUnauthorized";
import tableStyles from "@/components/DataTable.module.css";
import styles from "./AnalyticsClient.module.css";

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "All time", value: "" },
];

function formatPercent(value: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatScore(value: number | null) {
  return value == null ? "—" : value.toFixed(2);
}

export default function AnalyticsClient() {
  const [sinceDays, setSinceDays] = useState("7");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(range: string) {
    const query = range ? `?since_days=${range}` : "";

    try {
      const response = await fetch(`/api/analytics/summary${query}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError("Backend returned an error.");
        return;
      }

      setSummary(await response.json());
      setError(null);
    } catch {
      setError("Could not reach the backend.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/analytics/summary?since_days=7", {
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
          setSummary(data);
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

  function handleRangeChange(value: string) {
    setSinceDays(value);
    load(value);
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      <div className={styles.filters}>
        <label htmlFor="analytics-range">Range</label>
        <select
          id="analytics-range"
          value={sinceDays}
          onChange={(event) => handleRangeChange(event.target.value)}
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Total access attempts</p>
          <p className={styles.cardValue}>
            {summary?.total_access_attempts ?? "—"}
          </p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Verified (auto-admit) matches</p>
          <p className={styles.cardValue}>{summary?.verified_count ?? "—"}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Flagged false positives</p>
          <p className={styles.cardValue}>
            {summary?.false_positive_count ?? "—"}
          </p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>False-positive rate</p>
          <p className={styles.cardValue}>
            {summary ? formatPercent(summary.false_positive_rate) : "—"}
          </p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Avg. recognition score</p>
          <p className={styles.cardValue}>
            {summary ? formatScore(summary.average_recognition_score) : "—"}
          </p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Avg. liveness score</p>
          <p className={styles.cardValue}>
            {summary ? formatScore(summary.average_liveness_score) : "—"}
          </p>
        </div>
      </div>

      <div className={styles.breakdowns}>
        <div>
          <h3>By decision</h3>
          {!summary || Object.keys(summary.counts_by_decision).length === 0 ? (
            <p className={tableStyles.empty}>No data yet.</p>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Decision</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.counts_by_decision).map(
                  ([decision, count]) => (
                    <tr key={decision}>
                      <td>{decision}</td>
                      <td>{count}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h3>Movement by entrance</h3>
          {!summary || Object.keys(summary.movement_by_entrance).length === 0 ? (
            <p className={tableStyles.empty}>No data yet.</p>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Entrance</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.movement_by_entrance).map(
                  ([entrance, count]) => (
                    <tr key={entrance}>
                      <td>{entrance}</td>
                      <td>{count}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h3>Movement by person type</h3>
          {!summary ||
          Object.keys(summary.movement_by_person_type).length === 0 ? (
            <p className={tableStyles.empty}>No data yet.</p>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.movement_by_person_type).map(
                  ([personType, count]) => (
                    <tr key={personType}>
                      <td>{personType}</td>
                      <td>{count}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
