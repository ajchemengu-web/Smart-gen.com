"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  Investigation,
  InvestigationSeverity,
  InvestigationWithNotes,
  PendingAlert,
  PendingUnknown,
  ScenePerson,
  SceneResult,
  SightingFrequencyEntry,
  WatchlistSighting,
  WatchlistTarget,
} from "@/lib/api";
import { handleUnauthorized } from "@/lib/handleUnauthorized";
import styles from "./investigations.module.css";

const SEVERITIES: InvestigationSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ALERT_POLL_INTERVAL_MS = 15000;

function targetBadgeClass(status: string) {
  return status === "ACTIVE" ? styles.badgeActive : styles.badgeResolved;
}

function caseBadgeClass(status: string) {
  return status === "OPEN" ? styles.badgeOpen : styles.badgeClosed;
}

function severityBadgeClass(severity: string) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return styles.badgeActive;
    case "LOW":
      return styles.badgeResolved;
    default:
      return styles.badgeNeutral;
  }
}

function formatGap(seconds: number) {
  if (seconds < 60) return `${seconds}s apart`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0
    ? `${minutes}m apart`
    : `${minutes}m ${remainder}s apart`;
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

  const [sceneLocations, setSceneLocations] = useState<string[]>([]);
  const [sceneLocation, setSceneLocation] = useState("");
  const [sceneStart, setSceneStart] = useState("");
  const [sceneEnd, setSceneEnd] = useState("");
  const [sceneWindowMinutes, setSceneWindowMinutes] = useState("5");
  const [sceneResult, setSceneResult] = useState<SceneResult | null>(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [sceneCaseChoice, setSceneCaseChoice] = useState<
    Record<string, string>
  >({});
  const [addingSightingKey, setAddingSightingKey] = useState<string | null>(
    null
  );
  const [addedSightingKeys, setAddedSightingKeys] = useState<Set<string>>(
    new Set()
  );

  const [alerts, setAlerts] = useState<PendingAlert[]>([]);
  const [acknowledgingAlertId, setAcknowledgingAlertId] = useState<
    number | null
  >(null);

  const [pendingUnknowns, setPendingUnknowns] = useState<PendingUnknown[]>(
    []
  );

  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editSeverity, setEditSeverity] =
    useState<InvestigationSeverity>("MEDIUM");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [savingCaseEdit, setSavingCaseEdit] = useState(false);

  const [caseTargetChoice, setCaseTargetChoice] = useState<
    Record<string, string>
  >({});
  const [linkingTargetCaseId, setLinkingTargetCaseId] = useState<
    string | null
  >(null);
  const [caseUnknownChoice, setCaseUnknownChoice] = useState<
    Record<string, string>
  >({});
  const [linkingUnknownCaseId, setLinkingUnknownCaseId] = useState<
    string | null
  >(null);

  const [frequencyTargetId, setFrequencyTargetId] = useState<string | null>(
    null
  );
  const [frequency, setFrequency] = useState<SightingFrequencyEntry[]>([]);
  const [frequencyLoading, setFrequencyLoading] = useState(false);

  // `silent` skips touching targetError/caseError entirely — used
  // when refreshing the list after a create/resolve/close/etc.
  // action that already set its own success (cleared) or failure
  // (set) message. Without this, this refresh's own success would
  // race that message and clobber it back to null before it ever
  // rendered (both calls fire from the same finally block, and the
  // list GET normally resolves first).
  async function loadWatchlist(
    status = targetStatusFilter,
    { silent = false } = {}
  ) {
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
        if (!silent) setTargetError("Backend returned an error.");
        return;
      }

      setTargets(await response.json());
      if (!silent) setTargetError(null);
    } catch {
      if (!silent) setTargetError("Could not reach the backend.");
    }
  }

  async function loadInvestigations(
    status = caseStatusFilter,
    { silent = false } = {}
  ) {
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
        if (!silent) setCaseError("Backend returned an error.");
        return;
      }

      setCases(await response.json());
      if (!silent) setCaseError(null);
    } catch {
      if (!silent) setCaseError("Could not reach the backend.");
    }
  }

  async function loadSceneLocations() {
    try {
      const response = await fetch("/api/scene/locations", {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (response.ok) setSceneLocations(await response.json());
    } catch {
      // Locations are just a picker convenience — a free-text
      // location can still be typed, so a failure here isn't fatal.
    }
  }

  async function loadAlerts() {
    try {
      const response = await fetch("/api/alerts/pending", {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (response.ok) setAlerts(await response.json());
    } catch {
      // A poll queue — a failed poll just tries again next interval.
    }
  }

  async function loadPendingUnknowns() {
    try {
      const response = await fetch("/api/guard/pending", {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPendingUnknowns(data.unknown_persons ?? []);
      }
    } catch {
      // Same convenience-only reasoning as loadSceneLocations above.
    }
  }

  useEffect(() => {
    loadWatchlist();
    loadInvestigations();
    loadSceneLocations();
    loadAlerts();
    loadPendingUnknowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polls the target-alert queue on an interval — see alerts_service.py
  // for why this is a poll rather than a push notification. The ref
  // is updated in its own effect (not during render) so the interval
  // below always calls the latest closure without needing to restart.
  const alertsPollRef = useRef(loadAlerts);

  useEffect(() => {
    alertsPollRef.current = loadAlerts;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      alertsPollRef.current();
    }, ALERT_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  async function handleCreateTarget(formData: FormData) {
    setCreatingTarget(true);

    const fields = {
      full_name: String(formData.get("full_name") ?? ""),
      description: String(formData.get("description") ?? ""),
      reason: String(formData.get("reason") ?? ""),
      admission_number: String(formData.get("admission_number") ?? ""),
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
      loadWatchlist(undefined, { silent: true });
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
      loadWatchlist(undefined, { silent: true });
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
    const severity = String(
      formData.get("severity") ?? "MEDIUM"
    ) as InvestigationSeverity;
    const assignedTo = String(formData.get("assigned_to") ?? "");

    const fields = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      target_id: targetId,
      severity,
      assigned_to: assignedTo,
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
      loadInvestigations(undefined, { silent: true });
    }
  }

  // Unlike handleViewCase below, always fetches and sets — used to
  // refresh an already-expanded case after an action (link/unlink)
  // that isn't itself the toggle-open/closed gesture.
  async function refreshExpandedCase(caseId: string) {
    try {
      const response = await fetch(`/api/investigations/${encodeURIComponent(caseId)}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (response.ok) setExpandedCase(await response.json());
    } catch {
      setCaseError("Could not reach the backend.");
    }
  }

  async function handleViewCase(caseId: string) {
    if (expandedCase?.case_id === caseId) {
      setExpandedCase(null);
      return;
    }

    await refreshExpandedCase(caseId);
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
      loadInvestigations(undefined, { silent: true });
    }
  }

  async function handleAcknowledgeAlert(alertId: number) {
    setAcknowledgingAlertId(alertId);

    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "PATCH" });
    } finally {
      setAcknowledgingAlertId(null);
      loadAlerts();
    }
  }

  function startEditingCase(investigation: Investigation) {
    setEditingCaseId(investigation.case_id);
    setEditSeverity(investigation.severity);
    setEditAssignedTo(investigation.assigned_to ?? "");
  }

  async function handleSaveCaseEdit(caseId: string) {
    setSavingCaseEdit(true);

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(caseId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            severity: editSeverity,
            assigned_to: editAssignedTo,
          }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        if (expandedCase?.case_id === caseId) setExpandedCase(updated);
        setEditingCaseId(null);
      }
    } finally {
      setSavingCaseEdit(false);
      loadInvestigations(undefined, { silent: true });
    }
  }

  async function handleLinkTarget(caseId: string) {
    const targetId = caseTargetChoice[caseId];
    if (!targetId) return;

    setLinkingTargetCaseId(caseId);

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(caseId)}/targets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_id: targetId }),
        }
      );

      if (response.ok) {
        setExpandedCase(await response.json());
        setCaseTargetChoice((previous) => ({ ...previous, [caseId]: "" }));
      }
    } finally {
      setLinkingTargetCaseId(null);
    }
  }

  async function handleUnlinkTarget(caseId: string, targetId: string) {
    const response = await fetch(
      `/api/investigations/${encodeURIComponent(caseId)}/targets/${encodeURIComponent(targetId)}`,
      { method: "DELETE" }
    );

    if (response.ok && expandedCase?.case_id === caseId) {
      await refreshExpandedCase(caseId);
    }
  }

  async function handleLinkUnknown(caseId: string) {
    const unknownId = caseUnknownChoice[caseId];
    if (!unknownId) return;

    setLinkingUnknownCaseId(caseId);

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(caseId)}/unknowns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unknown_id: unknownId }),
        }
      );

      if (response.ok) {
        setExpandedCase(await response.json());
        setCaseUnknownChoice((previous) => ({ ...previous, [caseId]: "" }));
      }
    } finally {
      setLinkingUnknownCaseId(null);
    }
  }

  async function handleUnlinkUnknown(caseId: string, unknownId: string) {
    const response = await fetch(
      `/api/investigations/${encodeURIComponent(caseId)}/unknowns/${encodeURIComponent(unknownId)}`,
      { method: "DELETE" }
    );

    if (response.ok && expandedCase?.case_id === caseId) {
      await refreshExpandedCase(caseId);
    }
  }

  async function handleViewFrequency(targetId: string) {
    if (frequencyTargetId === targetId) {
      setFrequencyTargetId(null);
      return;
    }

    setFrequencyTargetId(targetId);
    setFrequencyLoading(true);

    try {
      const response = await fetch(
        `/api/watchlist/${encodeURIComponent(targetId)}/frequency`,
        { cache: "no-store" }
      );

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      setFrequency(response.ok ? await response.json() : []);
    } finally {
      setFrequencyLoading(false);
    }
  }

  function handlePrintCase(investigation: InvestigationWithNotes) {
    const win = window.open("", "_blank");
    if (!win) return;

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const targetsHtml = investigation.linked_targets.length
      ? `<ul>${investigation.linked_targets
          .map(
            (t) =>
              `<li>${escapeHtml(t.target_id)} — ${escapeHtml(t.full_name ?? "unknown")} (${escapeHtml(t.status ?? "unknown")})</li>`
          )
          .join("")}</ul>`
      : "<p>None linked.</p>";

    const unknownsHtml = investigation.linked_unknowns.length
      ? `<ul>${investigation.linked_unknowns
          .map(
            (u) =>
              `<li>${escapeHtml(u.unknown_id)} — ${escapeHtml(u.status ?? "unknown")}, detected ${escapeHtml(u.detected_at ?? "unknown")}</li>`
          )
          .join("")}</ul>`
      : "<p>None linked.</p>";

    const notesHtml = investigation.notes.length
      ? `<ol>${investigation.notes
          .map(
            (n) =>
              `<li>${escapeHtml(n.note)}<br/><small>${escapeHtml(n.author ?? "unknown")} · ${escapeHtml(n.created_at)}</small></li>`
          )
          .join("")}</ol>`
      : "<p>No notes.</p>";

    win.document.write(`
      <html>
        <head>
          <title>${escapeHtml(investigation.case_id)} report</title>
          <style>
            body { font-family: sans-serif; max-width: 720px; margin: 2rem auto; color: #111; }
            h1 { font-size: 1.4rem; }
            h2 { font-size: 1.05rem; margin-top: 1.5rem; }
            .meta { color: #555; font-size: 0.9rem; }
            ul, ol { padding-left: 1.2rem; }
            li { margin-bottom: 0.5rem; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(investigation.title)}</h1>
          <p class="meta">
            ${escapeHtml(investigation.case_id)} ·
            ${escapeHtml(investigation.status)} ·
            severity ${escapeHtml(investigation.severity)} ·
            assigned to ${escapeHtml(investigation.assigned_to ?? "unassigned")}<br/>
            opened by ${escapeHtml(investigation.opened_by ?? "unknown")} on ${escapeHtml(investigation.opened_at)}
            ${investigation.closed_at ? `<br/>closed by ${escapeHtml(investigation.closed_by ?? "unknown")} on ${escapeHtml(investigation.closed_at)}` : ""}
          </p>
          ${investigation.description ? `<p>${escapeHtml(investigation.description)}</p>` : ""}
          <h2>Linked targets</h2>
          ${targetsHtml}
          <h2>Linked unknown-person sightings</h2>
          ${unknownsHtml}
          <h2>Notes</h2>
          ${notesHtml}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  async function handleQueryScene(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSceneLoading(true);
    setSceneError(null);
    setAddedSightingKeys(new Set());

    const params = new URLSearchParams();
    if (sceneLocation.trim()) params.set("location", sceneLocation.trim());
    if (sceneStart) params.set("start_time", sceneStart);
    if (sceneEnd) params.set("end_time", sceneEnd);
    const windowMinutes = Number(sceneWindowMinutes);
    if (Number.isFinite(windowMinutes) && windowMinutes > 0) {
      params.set("co_occurrence_minutes", String(windowMinutes));
    }

    try {
      const response = await fetch(`/api/scene/query?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setSceneError("Backend returned an error.");
        return;
      }

      setSceneResult(await response.json());
    } catch {
      setSceneError("Could not reach the backend.");
    } finally {
      setSceneLoading(false);
    }
  }

  async function handleAddSightingToCase(person: ScenePerson) {
    const key = `${person.person_type}:${person.person_identifier}`;
    const caseId = sceneCaseChoice[key];
    if (!caseId) return;

    setAddingSightingKey(key);

    const who = person.full_name ?? person.person_identifier;
    const where = sceneResult?.location ?? "the queried location";
    const note =
      `Scene reconstruction: ${who} (${person.person_type}) seen ` +
      `${person.sighting_count}x at ${where}, between ` +
      `${person.first_seen} and ${person.last_seen}.`;

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(caseId)}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        }
      );

      if (response.ok) {
        setAddedSightingKeys((previous) => new Set(previous).add(key));
        if (expandedCase?.case_id === caseId) {
          setExpandedCase(await response.json());
        }
      }
    } finally {
      setAddingSightingKey(null);
    }
  }

  return (
    <div className={styles.wrapper}>
      {alerts.length > 0 && (
        <section className={styles.section}>
          <h2>
            Target alerts{" "}
            <span className={`${styles.badge} ${styles.badgeActive}`}>
              {alerts.length}
            </span>
          </h2>
          <p className={styles.helpText}>
            Every unacknowledged live target sighting. There&apos;s no
            push/email/SMS yet — this list refreshes on its own every{" "}
            {ALERT_POLL_INTERVAL_MS / 1000}s while this page is open.
          </p>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              data-testid={`alert-${alert.id}`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <h3>{alert.full_name ?? alert.person_identifier}</h3>
                <span className={`${styles.badge} ${styles.badgeActive}`}>
                  TARGET ALERT
                </span>
              </div>
              <p className={styles.cardMeta}>
                {alert.person_identifier}
                {alert.reason ? ` · ${alert.reason}` : ""}
                {alert.entrance ? ` · ${alert.entrance}` : ""} ·{" "}
                {alert.timestamp}
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={acknowledgingAlertId === alert.id}
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                  className={styles.actionButton}
                >
                  {acknowledgingAlertId === alert.id
                    ? "Acknowledging…"
                    : "Acknowledge"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className={styles.section}>
        <h2>Watchlist (target tracking)</h2>
        {targetError && <p className={styles.banner}>{targetError}</p>}
        <p className={styles.helpText}>
          A registered target is checked by the recognition pipeline ahead
          of students/guests once it has a reference photo — every live
          sighting is then logged automatically, with no repeat-visit
          cooldown, unlike a normal student/guest match. If this person is
          already enrolled as a student, enter their admission number
          instead of a name below — their own photo on file is reused, so
          no fresh photo is needed and the target is trackable right away.
        </p>

        <form action={handleCreateTarget} className={styles.form}>
          <label className={styles.field}>
            <span>Admission number (if already enrolled)</span>
            <input name="admission_number" placeholder="ADM-1234" />
          </label>
          <label className={styles.field}>
            <span>Full name (if not already enrolled)</span>
            <input name="full_name" />
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
            <div
              key={target.target_id}
              data-testid={`target-${target.target_id}`}
              className={styles.card}
            >
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
                {target.linked_student_id
                  ? ` · tracked by face (enrolled student ${target.linked_student_id})`
                  : target.embedding_file
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
                <button
                  type="button"
                  onClick={() => handleViewFrequency(target.target_id)}
                  className={styles.actionButton}
                >
                  {frequencyTargetId === target.target_id
                    ? "Hide frequency"
                    : "View frequency"}
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
              {frequencyTargetId === target.target_id && (
                <div className={styles.frequencyList}>
                  {frequencyLoading && (
                    <p className={styles.cardMeta}>Loading…</p>
                  )}
                  {!frequencyLoading && frequency.length === 0 && (
                    <p className={styles.cardMeta}>
                      No sightings to summarize yet.
                    </p>
                  )}
                  {!frequencyLoading &&
                    frequency.length > 0 &&
                    frequency.map((entry) => (
                      <div key={entry.entrance} className={styles.frequencyRow}>
                        <span className={styles.frequencyLabel}>
                          {entry.entrance} ({entry.count})
                        </span>
                        <div className={styles.frequencyBarTrack}>
                          <div
                            className={styles.frequencyBarFill}
                            style={{
                              width: `${(entry.count / frequency[0].count) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
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
          <label className={styles.field}>
            <span>Severity</span>
            <select name="severity" defaultValue="MEDIUM">
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Assigned to (optional)</span>
            <input name="assigned_to" placeholder="security1" />
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
            <div
              key={investigation.case_id}
              data-testid={`case-${investigation.case_id}`}
              className={styles.card}
            >
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
              <p className={styles.cardMeta}>
                <span className={`${styles.badge} ${severityBadgeClass(investigation.severity)}`}>
                  {investigation.severity}
                </span>{" "}
                · assigned to {investigation.assigned_to ?? "no one yet"}
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
                    ? "Hide details"
                    : "View details"}
                </button>
                <button
                  type="button"
                  onClick={() => startEditingCase(investigation)}
                  className={styles.actionButton}
                >
                  Edit
                </button>
                {expandedCase?.case_id === investigation.case_id && (
                  <button
                    type="button"
                    onClick={() => handlePrintCase(expandedCase)}
                    className={styles.actionButton}
                  >
                    Print report
                  </button>
                )}
              </div>
              {editingCaseId === investigation.case_id && (
                <div className={styles.noteForm}>
                  <select
                    aria-label="Edit severity"
                    value={editSeverity}
                    onChange={(event) =>
                      setEditSeverity(event.target.value as InvestigationSeverity)
                    }
                  >
                    {SEVERITIES.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Edit assigned to"
                    value={editAssignedTo}
                    onChange={(event) => setEditAssignedTo(event.target.value)}
                    placeholder="assigned to…"
                  />
                  <button
                    type="button"
                    disabled={savingCaseEdit}
                    onClick={() => handleSaveCaseEdit(investigation.case_id)}
                    className={styles.actionButton}
                  >
                    {savingCaseEdit ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCaseId(null)}
                    className={styles.actionButton}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {expandedCase?.case_id === investigation.case_id && (
                <>
                  <p className={styles.cardMeta}>
                    <strong>Linked targets:</strong>{" "}
                    {expandedCase.linked_targets.length === 0
                      ? "none"
                      : expandedCase.linked_targets
                          .map((t) => t.full_name ?? t.target_id)
                          .join(", ")}
                  </p>
                  {expandedCase.linked_targets.length > 0 && (
                    <div className={styles.actions}>
                      {expandedCase.linked_targets.map((t) => (
                        <button
                          key={t.target_id}
                          type="button"
                          onClick={() =>
                            handleUnlinkTarget(investigation.case_id, t.target_id)
                          }
                          className={styles.actionButton}
                        >
                          Unlink {t.full_name ?? t.target_id}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={styles.noteForm}>
                    <select
                      aria-label="Link another target"
                      value={caseTargetChoice[investigation.case_id] ?? ""}
                      onChange={(event) =>
                        setCaseTargetChoice((previous) => ({
                          ...previous,
                          [investigation.case_id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Link another target…</option>
                      {targets
                        .filter(
                          (t) =>
                            !expandedCase.linked_targets.some(
                              (linked) => linked.target_id === t.target_id
                            )
                        )
                        .map((t) => (
                          <option key={t.target_id} value={t.target_id}>
                            {t.target_id} — {t.full_name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={
                        !caseTargetChoice[investigation.case_id] ||
                        linkingTargetCaseId === investigation.case_id
                      }
                      onClick={() => handleLinkTarget(investigation.case_id)}
                      className={styles.actionButton}
                    >
                      {linkingTargetCaseId === investigation.case_id
                        ? "Linking…"
                        : "Link"}
                    </button>
                  </div>

                  <p className={styles.cardMeta}>
                    <strong>Linked unknown sightings:</strong>{" "}
                    {expandedCase.linked_unknowns.length === 0
                      ? "none"
                      : expandedCase.linked_unknowns
                          .map((u) => u.unknown_id)
                          .join(", ")}
                  </p>
                  {expandedCase.linked_unknowns.length > 0 && (
                    <div className={styles.actions}>
                      {expandedCase.linked_unknowns.map((u) => (
                        <button
                          key={u.unknown_id}
                          type="button"
                          onClick={() =>
                            handleUnlinkUnknown(
                              investigation.case_id,
                              u.unknown_id
                            )
                          }
                          className={styles.actionButton}
                        >
                          Unlink {u.unknown_id}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={styles.noteForm}>
                    <select
                      aria-label="Link an unknown sighting"
                      value={caseUnknownChoice[investigation.case_id] ?? ""}
                      onChange={(event) =>
                        setCaseUnknownChoice((previous) => ({
                          ...previous,
                          [investigation.case_id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Link an unknown sighting…</option>
                      {pendingUnknowns
                        .filter(
                          (u) =>
                            !expandedCase.linked_unknowns.some(
                              (linked) => linked.unknown_id === u.unknown_id
                            )
                        )
                        .map((u) => (
                          <option key={u.unknown_id} value={u.unknown_id}>
                            {u.unknown_id} — {u.detected_at}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={
                        !caseUnknownChoice[investigation.case_id] ||
                        linkingUnknownCaseId === investigation.case_id
                      }
                      onClick={() => handleLinkUnknown(investigation.case_id)}
                      className={styles.actionButton}
                    >
                      {linkingUnknownCaseId === investigation.case_id
                        ? "Linking…"
                        : "Link"}
                    </button>
                  </div>

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

      <section className={styles.section}>
        <h2>Scene reconstruction</h2>
        {sceneError && <p className={styles.banner}>{sceneError}</p>}
        <p className={styles.helpText}>
          Pick a location and a time window to see every face the
          recognition pipeline actually logged there during it — who was
          at this scene, and when. Attach a person&apos;s sighting summary
          to an open case below to record it in that case&apos;s note
          timeline.
        </p>

        <form onSubmit={handleQueryScene} className={styles.form}>
          <label className={styles.field}>
            <span>Location</span>
            <input
              name="location"
              list="scene-location-options"
              placeholder="e.g. Library Entrance"
              value={sceneLocation}
              onChange={(event) => setSceneLocation(event.target.value)}
            />
            <datalist id="scene-location-options">
              {sceneLocations.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
          </label>
          <label className={styles.field}>
            <span>From</span>
            <input
              type="datetime-local"
              value={sceneStart}
              onChange={(event) => setSceneStart(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>To</span>
            <input
              type="datetime-local"
              value={sceneEnd}
              onChange={(event) => setSceneEnd(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Co-occurrence window (min)</span>
            <input
              type="number"
              min="1"
              value={sceneWindowMinutes}
              onChange={(event) => setSceneWindowMinutes(event.target.value)}
            />
          </label>
          <div className={styles.submitRow}>
            <button type="submit" disabled={sceneLoading} className={styles.submit}>
              {sceneLoading ? "Searching…" : "Search scene"}
            </button>
          </div>
        </form>

        {sceneResult && (
          <>
            {sceneResult.people.length > 0 && (
              <p className={styles.helpText}>
                &quot;Also seen nearby&quot; below means within{" "}
                {sceneResult.co_occurrence_minutes} minute
                {sceneResult.co_occurrence_minutes === 1 ? "" : "s"} of that
                person&apos;s own sighting.
              </p>
            )}
            {sceneResult.people.length === 0 ? (
              <p className={styles.helpText}>
                No faces were recognized at that location/time window.
              </p>
            ) : (
              sceneResult.people.map((person) => {
                const key = `${person.person_type}:${person.person_identifier}`;
                const added = addedSightingKeys.has(key);

                return (
                  <div
                    key={key}
                    data-testid={`scene-person-${key}`}
                    className={styles.card}
                  >
                    <div className={styles.cardHeader}>
                      <h3>
                        {person.full_name ?? person.person_identifier}
                      </h3>
                      <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                        {person.person_type}
                      </span>
                    </div>
                    <p className={styles.cardMeta}>
                      {person.person_identifier} · seen{" "}
                      {person.sighting_count}x · first {person.first_seen} ·
                      last {person.last_seen}
                    </p>
                    {person.co_occurring.length > 0 && (
                      <p className={styles.cardMeta}>
                        Also seen nearby:{" "}
                        {person.co_occurring
                          .map(
                            (partner) =>
                              `${partner.full_name ?? partner.person_identifier} (${partner.person_type}, ${formatGap(partner.closest_gap_seconds)})`
                          )
                          .join(", ")}
                      </p>
                    )}
                    <div className={styles.noteForm}>
                      <select
                        aria-label="Add sighting to case"
                        value={sceneCaseChoice[key] ?? ""}
                        onChange={(event) =>
                          setSceneCaseChoice((previous) => ({
                            ...previous,
                            [key]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Add to case…</option>
                        {cases.map((investigation) => (
                          <option
                            key={investigation.case_id}
                            value={investigation.case_id}
                          >
                            {investigation.case_id} — {investigation.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          !sceneCaseChoice[key] || addingSightingKey === key
                        }
                        onClick={() => handleAddSightingToCase(person)}
                        className={styles.actionButton}
                      >
                        {added
                          ? "Added"
                          : addingSightingKey === key
                            ? "Adding…"
                            : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {sceneResult.sightings.length > 0 && (
              <ul className={styles.sightingsList}>
                {sceneResult.sightings.map((sighting) => (
                  <li key={sighting.id}>
                    {sighting.timestamp} ·{" "}
                    {sighting.full_name ?? sighting.person_identifier ?? "Unknown"}
                    {` (${sighting.person_type})`}
                    {sighting.decision ? ` · ${sighting.decision}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
