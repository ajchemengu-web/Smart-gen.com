"use client";

import { useEffect, useState } from "react";
import type {
  Investigation,
  InvestigationWithNotes,
  WatchlistSighting,
  WatchlistTarget,
} from "@/lib/api";
import { handleUnauthorized } from "@/lib/handleUnauthorized";
import styles from "./investigations.module.css";

function targetBadgeClass(status: string) {
  return status === "ACTIVE" ? styles.badgeActive : styles.badgeResolved;
}

function caseBadgeClass(status: string) {
  return status === "OPEN" ? styles.badgeOpen : styles.badgeClosed;
}

export default function SmartAccessClient() {
  const [targets, setTargets] = useState<WatchlistTarget[]>([]);
  const [targetStatusFilter, setTargetStatusFilter] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [creatingTarget, setCreatingTarget] = useState(false);
  const [busyTargetId, setBusyTargetId] = useState<string | null>(null);
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(
    null
  );
  const [sightings, setSightings] = useState<WatchlistSighting[]>([]);
  const [sightingsLoading, setSightingsLoading] = useState(false);

  const [cases, setCases] = useState<Investigation[]>([]);
  const [caseStatusFilter, setCaseStatusFilter] = useState("");
  const [caseError, setCaseError] = useState<string | null>(null);
  const [creatingCase, setCreatingCase] = useState(false);
  const [expandedCase, setExpandedCase] = useState<InvestigationWithNotes | null>(
    null
  );
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function loadWatchlist(status = targetStatusFilter) {
    const query = status ? `?status=${status}` : "";

    try {
      const response = await fetch(`/api/watchlist${query}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setTargetError("Backend returned an error.");
        return;
      }

      setTargets(await response.json());
      setTargetError(null);
    } catch {
      setTargetError("Could not reach the backend.");
    }
  }

  async function loadInvestigations(status = caseStatusFilter) {
    const query = status ? `?status=${status}` : "";

    try {
      const response = await fetch(`/api/investigations${query}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setCaseError("Backend returned an error.");
        return;
      }

      setCases(await response.json());
      setCaseError(null);
    } catch {
      setCaseError("Could not reach the backend.");
    }
  }

  useEffect(() => {
    loadWatchlist();
    loadInvestigations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateTarget(formData: FormData) {
    setCreatingTarget(true);

    const fields = {
      full_name: String(formData.get("full_name") ?? ""),
      description: String(formData.get("description") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    };

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setTargetError(data.detail ?? "Could not register the target.");
        return;
      }

      setTargetError(null);
    } finally {
      setCreatingTarget(false);
      loadWatchlist();
    }
  }

  async function handleToggleTargetStatus(target: WatchlistTarget) {
    setBusyTargetId(target.target_id);

    const action = target.status === "ACTIVE" ? "resolve" : "reactivate";

    try {
      await fetch(`/api/watchlist/${encodeURIComponent(target.target_id)}/${action}`, {
        method: "PATCH",
      });
    } finally {
      setBusyTargetId(null);
      loadWatchlist();
    }
  }

  async function handleViewSightings(targetId: string) {
    if (expandedTargetId === targetId) {
      setExpandedTargetId(null);
      return;
    }

    setExpandedTargetId(targetId);
    setSightingsLoading(true);

    try {
      const response = await fetch(
        `/api/watchlist/${encodeURIComponent(targetId)}/sightings`,
        { cache: "no-store" }
      );

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      setSightings(response.ok ? await response.json() : []);
    } finally {
      setSightingsLoading(false);
    }
  }

  async function handleCreateCase(formData: FormData) {
    setCreatingCase(true);

    const targetId = String(formData.get("target_id") ?? "");

    const fields = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      target_id: targetId,
    };

    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setCaseError(data.detail ?? "Could not open the case.");
        return;
      }

      setCaseError(null);
    } finally {
      setCreatingCase(false);
      loadInvestigations();
    }
  }

  async function handleViewCase(caseId: string) {
    if (expandedCase?.case_id === caseId) {
      setExpandedCase(null);
      return;
    }

    try {
      const response = await fetch(`/api/investigations/${encodeURIComponent(caseId)}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (response.ok) {
        setExpandedCase(await response.json());
      }
    } catch {
      setCaseError("Could not reach the backend.");
    }
  }

  async function handleAddNote(caseId: string) {
    if (!noteDraft.trim()) return;

    setAddingNote(true);

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(caseId)}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteDraft.trim() }),
        }
      );

      if (response.ok) {
        setExpandedCase(await response.json());
        setNoteDraft("");
      }
    } finally {
      setAddingNote(false);
    }
  }

  async function handleToggleCaseStatus(investigation: Investigation) {
    setBusyCaseId(investigation.case_id);

    const action = investigation.status === "OPEN" ? "close" : "reopen";

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(investigation.case_id)}/${action}`,
        { method: "PATCH" }
      );

      if (response.ok && expandedCase?.case_id === investigation.case_id) {
        await handleViewCase(investigation.case_id);
      }
    } finally {
      setBusyCaseId(null);
      loadInvestigations();
    }
  }

  return (
    <div className={styles.wrapper}>
      <section className={styles.section}>
        <h2>Watchlist (target tracking)</h2>
        {targetError && <p className={styles.banner}>{targetError}</p>}
        <p className={styles.helpText}>
          A registered target is checked by the recognition pipeline ahead
          of students/guests once it has a reference photo (added via the
          API for now) — every live sighting is logged automatically, with
          no repeat-visit cooldown, unlike a normal student/guest match.
        </p>

        <form action={handleCreateTarget} className={styles.form}>
          <label className={styles.field}>
            <span>Full name</span>
            <input name="full_name" required />
          </label>
          <label className={styles.field}>
            <span>Description</span>
            <input name="description" placeholder="Tall, red jacket" />
          </label>
          <label className={styles.field}>
            <span>Reason</span>
            <input name="reason" placeholder="Reported theft" />
          </label>
          <div className={styles.submitRow}>
            <button type="submit" disabled={creatingTarget} className={styles.submit}>
              {creatingTarget ? "Registering…" : "Register target"}
            </button>
          </div>
        </form>

        <div className={styles.filters}>
          <select
            value={targetStatusFilter}
            onChange={(event) => {
              setTargetStatusFilter(event.target.value);
              loadWatchlist(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {targets.length === 0 ? (
          <p className={styles.helpText}>No targets registered yet.</p>
        ) : (
          targets.map((target) => (
            <div key={target.target_id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{target.full_name}</h3>
                <span className={`${styles.badge} ${targetBadgeClass(target.status)}`}>
                  {target.status}
                </span>
              </div>
              <p className={styles.cardMeta}>
                {target.target_id}
                {target.description ? ` · ${target.description}` : ""}
                {target.reason ? ` · ${target.reason}` : ""}
                {target.embedding_file
                  ? " · tracked by face"
                  : " · no reference photo yet"}
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busyTargetId === target.target_id}
                  onClick={() => handleToggleTargetStatus(target)}
                  className={styles.actionButton}
                >
                  {target.status === "ACTIVE" ? "Mark resolved" : "Reactivate"}
                </button>
                <button
                  type="button"
                  onClick={() => handleViewSightings(target.target_id)}
                  className={styles.actionButton}
                >
                  {expandedTargetId === target.target_id
                    ? "Hide sightings"
                    : "View sightings"}
                </button>
              </div>
              {expandedTargetId === target.target_id && (
                <ul className={styles.sightingsList}>
                  {sightingsLoading && <li>Loading…</li>}
                  {!sightingsLoading && sightings.length === 0 && (
                    <li>No sightings logged yet.</li>
                  )}
                  {!sightingsLoading &&
                    sightings.map((sighting) => (
                      <li key={sighting.id}>
                        {sighting.timestamp} · {sighting.entrance ?? "Unknown entrance"}
                        {sighting.decision ? ` · ${sighting.decision}` : ""}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))
        )}
      </section>

      <section className={styles.section}>
        <h2>Investigations</h2>
        {caseError && <p className={styles.banner}>{caseError}</p>}

        <form action={handleCreateCase} className={styles.form}>
          <label className={styles.field}>
            <span>Title</span>
            <input name="title" required />
          </label>
          <label className={styles.field}>
            <span>Description</span>
            <input name="description" />
          </label>
          <label className={styles.field}>
            <span>Linked target (optional)</span>
            <select name="target_id" defaultValue="">
              <option value="">None</option>
              {targets.map((target) => (
                <option key={target.target_id} value={target.target_id}>
                  {target.target_id} — {target.full_name}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.submitRow}>
            <button type="submit" disabled={creatingCase} className={styles.submit}>
              {creatingCase ? "Opening…" : "Open case"}
            </button>
          </div>
        </form>

        <div className={styles.filters}>
          <select
            value={caseStatusFilter}
            onChange={(event) => {
              setCaseStatusFilter(event.target.value);
              loadInvestigations(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {cases.length === 0 ? (
          <p className={styles.helpText}>No cases yet.</p>
        ) : (
          cases.map((investigation) => (
            <div key={investigation.case_id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{investigation.title}</h3>
                <span className={`${styles.badge} ${caseBadgeClass(investigation.status)}`}>
                  {investigation.status}
                </span>
              </div>
              <p className={styles.cardMeta}>
                {investigation.case_id}
                {investigation.target_id ? ` · linked to ${investigation.target_id}` : ""}
                {investigation.description ? ` · ${investigation.description}` : ""}
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busyCaseId === investigation.case_id}
                  onClick={() => handleToggleCaseStatus(investigation)}
                  className={styles.actionButton}
                >
                  {investigation.status === "OPEN" ? "Close case" : "Reopen case"}
                </button>
                <button
                  type="button"
                  onClick={() => handleViewCase(investigation.case_id)}
                  className={styles.actionButton}
                >
                  {expandedCase?.case_id === investigation.case_id
                    ? "Hide notes"
                    : "View notes"}
                </button>
              </div>
              {expandedCase?.case_id === investigation.case_id && (
                <>
                  <ul className={styles.notesList}>
                    {expandedCase.notes.length === 0 && <li>No notes yet.</li>}
                    {expandedCase.notes.map((note) => (
                      <li key={note.id} className={styles.noteItem}>
                        {note.note}
                        <p className={styles.noteMeta}>
                          {note.author ?? "unknown"} · {note.created_at}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.noteForm}>
                    <input
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Add a note…"
                    />
                    <button
                      type="button"
                      disabled={addingNote}
                      onClick={() => handleAddNote(investigation.case_id)}
                      className={styles.actionButton}
                    >
                      {addingNote ? "Adding…" : "Add note"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
