"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  Investigation,
  InvestigationWithNotes,
  ScenePerson,
  SceneResult,
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

  const [sceneLocations, setSceneLocations] = useState<string[]>([]);
  const [sceneLocation, setSceneLocation] = useState("");
  const [sceneStart, setSceneStart] = useState("");
  const [sceneEnd, setSceneEnd] = useState("");
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

  useEffect(() => {
    loadWatchlist();
    loadInvestigations();
    loadSceneLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      loadInvestigations(undefined, { silent: true });
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
      loadInvestigations(undefined, { silent: true });
    }
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
          <div className={styles.submitRow}>
            <button type="submit" disabled={sceneLoading} className={styles.submit}>
              {sceneLoading ? "Searching…" : "Search scene"}
            </button>
          </div>
        </form>

        {sceneResult && (
          <>
            {sceneResult.people.length === 0 ? (
              <p className={styles.helpText}>
                No faces were recognized at that location/time window.
              </p>
            ) : (
              sceneResult.people.map((person) => {
                const key = `${person.person_type}:${person.person_identifier}`;
                const added = addedSightingKeys.has(key);

                return (
                  <div key={key} className={styles.card}>
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
