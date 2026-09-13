// Talks to the SmartAccess/recognition-engine backend that lives in
// the Alternative_Identifier repo (src/api/main.py). Server-only —
// this file is never bundled for the client, so API_BASE_URL does
// not need the NEXT_PUBLIC_ prefix.
//
// Every endpoint except POST /login now requires an
// `Authorization: Bearer <access_token>` header (src/api/deps.py in
// that repo) — pass the caller's session accessToken (src/lib/
// session.ts) as the `token` argument on every function below that
// takes one.

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string
): Promise<T> {
  let response: Response;

  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the backend API. Is it running?"
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.detail ?? "Request failed"
    );
  }

  return data as T;
}

function postJson<T>(path: string, body: object, token?: string) {
  return request<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    token
  );
}

// ============================================================
// LOGIN / ENROLLMENT (docs/PRD.md §5, §9)
// ============================================================

export type LoginResult = {
  username: string;
  email: string;
  role: string;
  admin_tier: string | null;
  dashboard: string | null;
  access_token: string;
};

export type EnrollResult = {
  username: string;
  email: string;
  role: string;
  admin_tier: string | null;
  dashboard: string | null;
};

export function login(username: string, password: string) {
  // The one endpoint that takes no token — it's how you get one.
  return postJson<LoginResult>("/login", { username, password });
}

export function enroll(
  fields: {
    username: string;
    password: string;
    email: string;
    role: string;
    admin_tier?: string;
    linked_person_id?: string;
  },
  token: string
) {
  return postJson<EnrollResult>("/enroll", fields, token);
}

// ============================================================
// GUARD DASHBOARD (docs/PRD.md §6.2)
// ============================================================

export type PendingUnknown = {
  unknown_id: string;
  image_path: string;
  status: string;
  detected_at: string;
};

export type AccessLogEntry = {
  id: number;
  person_type: string;
  person_identifier: string | null;
  entrance: string | null;
  recognition_score: number | null;
  liveness_score: number | null;
  decision: string | null;
  guard_id: string | null;
  timestamp: string;
};

export function getPendingUnknowns(token: string) {
  return request<{
    total_pending: number;
    unknown_persons: PendingUnknown[];
  }>("/guard/pending", undefined, token);
}

export function getAccessLogs(token: string) {
  return request<AccessLogEntry[]>("/access-logs", undefined, token);
}

export function admitUnknown(unknownId: string, token: string) {
  return request(
    `/guard/admit/${encodeURIComponent(unknownId)}`,
    { method: "POST" },
    token
  );
}

export function rejectUnknown(unknownId: string, token: string) {
  return request(
    `/guard/reject/${encodeURIComponent(unknownId)}`,
    { method: "POST" },
    token
  );
}

// ============================================================
// ADMIN OVERVIEW (docs/PRD.md §8)
// ============================================================

export type Student = {
  student_id: string;
  full_name: string;
  admission_number: string;
  hostel: string;
  room: string;
};

export type Guest = {
  guest_id: string;
  status: string;
  admitted_by: string | null;
  admitted_at: string | null;
  expires_at: string | null;
};

export function getStudents(token: string) {
  return request<Student[]>("/students", undefined, token);
}

export function getGuests(token: string) {
  return request<Guest[]>("/guests", undefined, token);
}

// ============================================================
// TIMETABLING (docs/PRD.md §8)
// ============================================================

export type TimetableEntry = {
  id: number;
  course: string;
  year: number;
  department: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  unit_name: string;
  facilitator: string;
  venue: string;
  status: string;
  created_by: string | null;
  created_at: string;
};

export function getTimetable(
  token: string,
  filters?: { course?: string; year?: number; department?: string }
) {
  const params = new URLSearchParams();
  if (filters?.course) params.set("course", filters.course);
  if (filters?.year != null) params.set("year", String(filters.year));
  if (filters?.department) params.set("department", filters.department);
  const query = params.toString();

  return request<TimetableEntry[]>(
    `/timetable${query ? `?${query}` : ""}`,
    undefined,
    token
  );
}

export function createTimetableEntry(
  fields: {
    course: string;
    year: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    unit_name: string;
    facilitator: string;
    venue: string;
    department?: string;
  },
  token: string
) {
  return postJson<TimetableEntry>("/timetable", fields, token);
}

export function updateTimetableEntryStatus(
  entryId: number,
  status: string,
  token: string
) {
  return request(
    `/timetable/${entryId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    token
  );
}

export function deleteTimetableEntry(entryId: number, token: string) {
  return request(
    `/timetable/${entryId}`,
    { method: "DELETE" },
    token
  );
}

// ============================================================
// CAMERA MANAGEMENT (docs/PRD.md §8)
// ============================================================
//
// A persisted camera registry, not a live video feed — see
// camera_service.py's docstring in Alternative_Identifier for why.
// Original Admin: full control. Security Admin: view + configure/
// status, no create or delete (backend enforces this — see
// src/api/main.py's require_admin_tier calls on each endpoint).
// Dean of School: view only, department-filtered ("venue camera
// access").

export type Camera = {
  camera_id: string;
  name: string;
  camera_type: string;
  location: string | null;
  department: string | null;
  source: string | null;
  status: string;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
};

export function getCameras(
  token: string,
  filters?: { camera_type?: string; department?: string; status?: string }
) {
  const params = new URLSearchParams();
  if (filters?.camera_type) params.set("camera_type", filters.camera_type);
  if (filters?.department) params.set("department", filters.department);
  if (filters?.status) params.set("status", filters.status);
  const query = params.toString();

  return request<Camera[]>(
    `/cameras${query ? `?${query}` : ""}`,
    undefined,
    token
  );
}

export function createCamera(
  fields: {
    camera_id: string;
    name: string;
    camera_type: string;
    location?: string;
    department?: string;
    source?: string;
  },
  token: string
) {
  return postJson<Camera>("/cameras", fields, token);
}

export function updateCamera(
  cameraId: string,
  fields: {
    name?: string;
    location?: string;
    source?: string;
    enabled?: boolean;
  },
  token: string
) {
  return request(
    `/cameras/${encodeURIComponent(cameraId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    },
    token
  );
}

export function updateCameraStatus(
  cameraId: string,
  status: string,
  token: string
) {
  return request(
    `/cameras/${encodeURIComponent(cameraId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    token
  );
}

export function deleteCamera(cameraId: string, token: string) {
  return request(
    `/cameras/${encodeURIComponent(cameraId)}`,
    { method: "DELETE" },
    token
  );
}

// ============================================================
// DEAN OF SCHOOL ADMIN (docs/PRD.md §8)
// ============================================================
//
// Read-only: roster + classification/unit totals for a department,
// plus the department's timetable (via getTimetable above). Class
// logs and venue camera access are out of scope — the backend has
// no classroom-camera pipeline or camera management yet.

export type DeanRosterEntry = {
  student_id: string;
  full_name: string;
  admission_number: string;
  department: string | null;
  course: string | null;
  year: number | null;
};

export type DeanClassification = {
  course: string | null;
  year: number | null;
  student_count: number;
};

export type DeanSummary = {
  department: string | null;
  total_students: number;
  roster_by_classification: DeanClassification[];
  total_units: number;
  total_active_lectures: number;
  total_timetable_entries: number;
};

export function getDeanRoster(token: string, department?: string) {
  const query = department
    ? `?department=${encodeURIComponent(department)}`
    : "";
  return request<DeanRosterEntry[]>(`/dean/roster${query}`, undefined, token);
}

export function getDeanSummary(token: string, department?: string) {
  const query = department
    ? `?department=${encodeURIComponent(department)}`
    : "";
  return request<DeanSummary>(`/dean/summary${query}`, undefined, token);
}

// ============================================================
// ROUTE HANDLER HELPER
// ============================================================
//
// Shared shape for the Next.js Route Handlers under src/app/api/*
// that proxy these calls to the browser (so the client never talks
// to API_BASE_URL, or the backend's access_token, directly).

export function apiErrorResponse(error: unknown) {
  const status = error instanceof ApiError ? error.status || 502 : 502;
  const message =
    error instanceof ApiError ? error.message : "Request failed";
  return { status, body: { detail: message } };
}
