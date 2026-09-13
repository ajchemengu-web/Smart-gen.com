"use client";

import { useEffect, useState } from "react";
import type { Camera } from "@/lib/api";
import { handleUnauthorized } from "@/lib/handleUnauthorized";
import tableStyles from "@/components/DataTable.module.css";
import styles from "./CameraManagementClient.module.css";

// camera_type picks which Smart Gen product a camera serves —
// CHECKPOINT cameras are SmartAccess (a gate/checkpoint), CLASSROOM
// cameras are SmartAttendance (see Alternative_Identifier's
// camera_service.py). Labeled by product here so an admin adding a
// camera isn't left guessing what the raw enum values mean.
const CAMERA_TYPES: { value: string; label: string }[] = [
  { value: "CHECKPOINT", label: "Smart Access (checkpoint/gate)" },
  { value: "CLASSROOM", label: "Smart Attendance (classroom)" },
];

function cameraTypeLabel(cameraType: string) {
  return (
    CAMERA_TYPES.find((type) => type.value === cameraType)?.label ??
    cameraType
  );
}

function statusClass(status: string) {
  if (status === "ONLINE") return styles.statusOnline;
  if (status === "MAINTENANCE") return styles.statusMaintenance;
  return styles.statusOffline;
}

// Original Admin gets full control (canCreate + canDelete); Security
// Admin can view and configure/change status but not provision or
// remove a camera (docs/PRD.md §8) — the backend enforces this too
// (require_admin_tier on each endpoint), this just hides the
// controls that would 403 anyway.
export default function CameraManagementClient({
  canCreate,
  canDelete,
}: {
  canCreate: boolean;
  canDelete: boolean;
}) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (typeFilter) params.set("camera_type", typeFilter);
    const query = params.toString();

    try {
      const response = await fetch(
        `/api/cameras${query ? `?${query}` : ""}`,
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

      setCameras(await response.json());
      setError(null);
    } catch {
      setError("Could not reach the backend.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/cameras", { cache: "no-store" });

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
          setCameras(data);
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

  async function handleCreate(formData: FormData) {
    setSubmitting(true);

    const fields = {
      camera_id: String(formData.get("camera_id") ?? ""),
      name: String(formData.get("name") ?? ""),
      camera_type: String(formData.get("camera_type") ?? ""),
      location: String(formData.get("location") ?? ""),
      department: String(formData.get("department") ?? ""),
      source: String(formData.get("source") ?? ""),
    };

    try {
      const response = await fetch("/api/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.detail ?? "Could not create the camera.");
        return;
      }

      setError(null);
    } finally {
      setSubmitting(false);
      load();
    }
  }

  async function handleStatusChange(cameraId: string, status: string) {
    setBusyId(cameraId);

    try {
      await fetch(`/api/cameras/${encodeURIComponent(cameraId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusyId(null);
      load();
    }
  }

  async function handleToggleEnabled(cameraId: string, enabled: boolean) {
    setBusyId(cameraId);

    try {
      await fetch(`/api/cameras/${encodeURIComponent(cameraId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
    } finally {
      setBusyId(null);
      load();
    }
  }

  async function handleDelete(cameraId: string) {
    setBusyId(cameraId);

    try {
      await fetch(`/api/cameras/${encodeURIComponent(cameraId)}`, {
        method: "DELETE",
      });
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <div className={styles.wrapper}>
      {error && <p className={styles.banner}>{error}</p>}

      {canCreate && (
        <section>
          <h2>Add a camera</h2>
          <form action={handleCreate} className={styles.form}>
            <label className={styles.field}>
              <span>Camera ID</span>
              <input name="camera_id" required />
            </label>
            <label className={styles.field}>
              <span>Name</span>
              <input name="name" required />
            </label>
            <label className={styles.field}>
              <span>Serves</span>
              <select name="camera_type" defaultValue="CHECKPOINT">
                {CAMERA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Location</span>
              <input name="location" placeholder="Main Gate (North Entrance)" required />
            </label>
            <label className={styles.field}>
              <span>Department (classroom cameras)</span>
              <input name="department" />
            </label>
            <label className={styles.field}>
              <span>IP address / stream URL</span>
              <input
                name="source"
                placeholder="rtsp://192.168.1.50:554/stream"
                required
              />
            </label>
            <div className={styles.submitRow}>
              <button
                type="submit"
                disabled={submitting}
                className={styles.submit}
              >
                {submitting ? "Adding…" : "Add camera"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section>
        <h2>Cameras</h2>

        <div className={styles.filters}>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            {CAMERA_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <button type="button" className={styles.filterButton} onClick={load}>
            Apply filter
          </button>
        </div>

        {cameras.length === 0 ? (
          <p className={tableStyles.empty}>No cameras registered yet.</p>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Camera ID</th>
                <th>Name</th>
                <th>Serves</th>
                <th>Location</th>
                <th>IP / Stream</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((camera) => (
                <tr key={camera.camera_id}>
                  <td>{camera.camera_id}</td>
                  <td>{camera.name}</td>
                  <td>{cameraTypeLabel(camera.camera_type)}</td>
                  <td>{camera.location ?? "—"}</td>
                  <td>{camera.source ?? "—"}</td>
                  <td>{camera.department ?? "—"}</td>
                  <td className={statusClass(camera.status)}>
                    {camera.status}
                    {!camera.enabled && (
                      <span className={styles.disabledBadge}>disabled</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {camera.status !== "ONLINE" && (
                        <button
                          disabled={busyId === camera.camera_id}
                          onClick={() =>
                            handleStatusChange(camera.camera_id, "ONLINE")
                          }
                          className={styles.actionButton}
                        >
                          Mark online
                        </button>
                      )}
                      {camera.status !== "OFFLINE" && (
                        <button
                          disabled={busyId === camera.camera_id}
                          onClick={() =>
                            handleStatusChange(camera.camera_id, "OFFLINE")
                          }
                          className={styles.actionButton}
                        >
                          Mark offline
                        </button>
                      )}
                      {camera.status !== "MAINTENANCE" && (
                        <button
                          disabled={busyId === camera.camera_id}
                          onClick={() =>
                            handleStatusChange(camera.camera_id, "MAINTENANCE")
                          }
                          className={styles.actionButton}
                        >
                          Maintenance
                        </button>
                      )}
                      <button
                        disabled={busyId === camera.camera_id}
                        onClick={() =>
                          handleToggleEnabled(
                            camera.camera_id,
                            !camera.enabled
                          )
                        }
                        className={styles.actionButton}
                      >
                        {camera.enabled ? "Disable" : "Enable"}
                      </button>
                      {canDelete && (
                        <button
                          disabled={busyId === camera.camera_id}
                          onClick={() => handleDelete(camera.camera_id)}
                          className={styles.deleteButton}
                        >
                          Delete
                        </button>
                      )}
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
