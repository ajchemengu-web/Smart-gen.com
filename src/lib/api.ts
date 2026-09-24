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

  // Harmless against a normal host; needed when API_BASE_URL is a free
  // ngrok tunnel, which otherwise serves an HTML interstitial page in
  // place of the real JSON response on first contact from a given IP.
  headers.set("ngrok-skip-browser-warning", "true");

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

// A handful of backend endpoints (POST /watchlist, POST /enroll/
// student-face) accept an optional file upload alongside plain
// fields, which makes FastAPI treat the whole request as
// multipart/form-data rather than JSON — even the plain string
// fields must travel as form fields. No Content-Type header here:
// fetch sets the multipart boundary itself from the FormData body.
function postForm<T>(
  path: string,
  fields: Record<string, string | undefined>,
  token?: string,
  files?: { field: string; file: File | Blob; filename?: string }[]
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== "") form.append(key, value);
  }
  for (const { field, file, filename } of files ?? []) {
    form.append(field, file, filename);
  }

  return request<T>(path, { method: "POST", body: form }, token);
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
  location: string | null;
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
    location?: string;
  },
  token: string
) {
  return postJson<EnrollResult>("/enroll", fields, token);
}

// ============================================================
// STUDENT FACIAL ENROLLMENT (docs/PRD.md §5)
// ============================================================
//
// A separate step from enroll() above — that only creates the login
// (users table). This is what actually creates the students table
// row GET /students reads, via one or more reference photos
// (Alternative_Identifier's enrollment_service.py computes and
// averages an embedding per usable photo). A STUDENT login with no
// facial enrollment never appears on the Students list.

export type StudentFaceEnrollResult = {
  student_id: string;
  full_name: string;
  admission_number: string;
  hostel: string;
  room: string;
  department: string | null;
  course: string | null;
  year: number | null;
  semester: number | null;
  samples_used: number;
  samples_skipped: number;
};

export function enrollStudentFace(
  fields: {
    student_id: string;
    full_name: string;
    admission_number: string;
    hostel: string;
    room: string;
    department?: string;
    course?: string;
    year?: string;
    semester?: string;
  },
  photos: File[],
  token: string
) {
  return postForm<StudentFaceEnrollResult>(
    "/enroll/student-face",
    fields,
    token,
    photos.map((file) => ({ field: "files", file }))
  );
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
  false_positive: boolean;
  false_positive_reason: string | null;
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

export function flagAccessLogFalsePositive(
  accessLogId: number,
  reason: string,
  token: string
) {
  return request(
    `/access-logs/${accessLogId}/false-positive`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
    token
  );
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
  face_enrolled: boolean;
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

// Registers just the record (docs/PRD.md §5) — no photo, no
// embedding. Pairs with the student later self-enrolling their own
// face from the SmartAttendance app (POST /me/enroll-face there);
// see StudentFaceEnrollmentClient for the admin-does-it-directly
// alternative, which still works standalone via
// POST /enroll/student-face.
export type StudentRecordResult = Omit<Student, "face_enrolled"> & {
  face_enrolled: false;
};

export function createStudent(
  fields: {
    student_id: string;
    full_name: string;
    admission_number: string;
    hostel: string;
    room: string;
    department?: string;
    course?: string;
    year?: number;
    semester?: number;
  },
  token: string
) {
  return postJson<StudentRecordResult>("/students", fields, token);
}

export function getGuests(token: string) {
  return request<Guest[]>("/guests", undefined, token);
}

// ============================================================
// UNITS (docs/PRD.md §6, §8)
// ============================================================
//
// The Timetabling Admin creates a unit once; a lecturer then
// self-registers (claims) the units they teach from the
// SmartAttendance app — that claim, not a facilitator name typed
// per timetable row, is what timetable_entries.lecturer_id derives
// from. See Alternative_Identifier's unit_service.py.

export type Unit = {
  id: number;
  unit_code: string;
  unit_name: string;
  department: string | null;
  course: string;
  year: number;
  semester: number;
  lecturer_id: string | null;
  created_by: string | null;
  created_at: string;
};

export function getUnits(
  token: string,
  filters?: {
    department?: string;
    course?: string;
    year?: number;
    semester?: number;
    unclaimed?: boolean;
  }
) {
  const params = new URLSearchParams();
  if (filters?.department) params.set("department", filters.department);
  if (filters?.course) params.set("course", filters.course);
  if (filters?.year != null) params.set("year", String(filters.year));
  if (filters?.semester != null)
    params.set("semester", String(filters.semester));
  if (filters?.unclaimed) params.set("unclaimed", "true");
  const query = params.toString();

  return request<Unit[]>(`/units${query ? `?${query}` : ""}`, undefined, token);
}

export function createUnit(
  fields: {
    unit_code: string;
    unit_name: string;
    course: string;
    year: number;
    semester: number;
    department?: string;
  },
  token: string
) {
  return postJson<Unit>("/units", fields, token);
}

export function setUnitLecturer(
  unitId: number,
  lecturerId: string | null,
  token: string
) {
  return request<Unit>(
    `/units/${unitId}/lecturer`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lecturer_id: lecturerId }),
    },
    token
  );
}

// ============================================================
// TIMETABLING (docs/PRD.md §8)
// ============================================================

export type TimetableEntry = {
  id: number;
  unit_id: number | null;
  unit_code: string | null;
  course: string;
  year: number;
  department: string | null;
  semester: number | null;
  lecturer_id: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  unit_name: string;
  facilitator: string | null;
  venue: string;
  status: string;
  created_by: string | null;
  created_at: string;
};

export function getTimetable(
  token: string,
  filters?: {
    course?: string;
    year?: number;
    department?: string;
    semester?: number;
    lecturerId?: string;
    unitId?: number;
  }
) {
  const params = new URLSearchParams();
  if (filters?.course) params.set("course", filters.course);
  if (filters?.year != null) params.set("year", String(filters.year));
  if (filters?.department) params.set("department", filters.department);
  if (filters?.semester != null)
    params.set("semester", String(filters.semester));
  if (filters?.lecturerId) params.set("lecturer_id", filters.lecturerId);
  if (filters?.unitId != null) params.set("unit_id", String(filters.unitId));
  const query = params.toString();

  return request<TimetableEntry[]>(
    `/timetable${query ? `?${query}` : ""}`,
    undefined,
    token
  );
}

export function createTimetableEntry(
  fields: {
    unit_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    venue: string;
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
    location: string;
    source: string;
    department?: string;
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
// LECTURER PROFILES (docs/PRD.md §5, §6)
// ============================================================
//
// Register a lecturer's profile (full_name/department, no facial
// embedding — see Alternative_Identifier's lecturer_service.py)
// before enrolling their LECTURER login via enroll() above,
// referencing this lecturer_id as linked_person_id. Lets
// SmartAttendance resolve a logged-in lecturer to their own units.

export type Lecturer = {
  lecturer_id: string;
  full_name: string;
  department: string | null;
};

export function getLecturers(token: string, department?: string) {
  const query = department
    ? `?department=${encodeURIComponent(department)}`
    : "";
  return request<Lecturer[]>(`/lecturers${query}`, undefined, token);
}

export function createLecturer(
  fields: { lecturer_id: string; full_name: string; department?: string },
  token: string
) {
  return postJson<Lecturer>("/lecturers", fields, token);
}

// ============================================================
// ANALYTICS (docs/PRD.md §13, Phase 3)
// ============================================================

export type AnalyticsSummary = {
  total_access_attempts: number;
  counts_by_decision: Record<string, number>;
  movement_by_entrance: Record<string, number>;
  movement_by_person_type: Record<string, number>;
  verified_count: number;
  false_positive_count: number;
  false_positive_rate: number | null;
  average_recognition_score: number | null;
  average_liveness_score: number | null;
};

export function getAnalyticsSummary(token: string, sinceDays?: number) {
  const query = sinceDays != null ? `?since_days=${sinceDays}` : "";
  return request<AnalyticsSummary>(`/analytics/summary${query}`, undefined, token);
}

// ============================================================
// SMARTACCESS: WATCHLIST / TARGET TRACKING (docs/PRD.md §6.3a, §8)
// ============================================================
//
// A dashboard surface dedicated to SmartAccess itself (Security/
// Original Admin). A target with a stored embedding is checked by
// the live recognition pipeline ahead of students/guests — see
// Alternative_Identifier's watchlist_service.py. Two ways to give a
// target that embedding: an admission_number (if the person is
// already enrolled as a student, this reuses their own stored
// embedding — no photo needed, and this is the path the dashboard's
// form actually offers), or a fresh photo (POST /watchlist's
// optional `images`, which has no web upload UI yet — same gap as
// student facial enrollment).

export type WatchlistTarget = {
  target_id: string;
  full_name: string;
  description: string | null;
  reason: string | null;
  status: string;
  embedding_file: string | null;
  linked_student_id: string | null;
  created_by: string | null;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
};

export type WatchlistSighting = {
  id: number;
  person_type: string;
  person_identifier: string;
  entrance: string | null;
  recognition_score: number | null;
  decision: string | null;
  liveness_score: number | null;
  timestamp: string;
};

export function getWatchlist(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<WatchlistTarget[]>(`/watchlist${query}`, undefined, token);
}

export function createWatchlistTarget(
  fields: {
    full_name?: string;
    description?: string;
    reason?: string;
    admission_number?: string;
  },
  token: string
) {
  return postForm<WatchlistTarget>("/watchlist", fields, token);
}

export function getWatchlistSightings(targetId: string, token: string) {
  return request<WatchlistSighting[]>(
    `/watchlist/${encodeURIComponent(targetId)}/sightings`,
    undefined,
    token
  );
}

export function resolveWatchlistTarget(targetId: string, token: string) {
  return request(
    `/watchlist/${encodeURIComponent(targetId)}/resolve`,
    { method: "PATCH" },
    token
  );
}

export function reactivateWatchlistTarget(targetId: string, token: string) {
  return request(
    `/watchlist/${encodeURIComponent(targetId)}/reactivate`,
    { method: "PATCH" },
    token
  );
}

export type SightingFrequencyEntry = {
  entrance: string;
  count: number;
};

export function getWatchlistFrequency(targetId: string, token: string) {
  return request<SightingFrequencyEntry[]>(
    `/watchlist/${encodeURIComponent(targetId)}/frequency`,
    undefined,
    token
  );
}

// ============================================================
// SMARTACCESS: TARGET ALERTS (docs/PRD.md §6.3a, §8)
// ============================================================
//
// A poll queue of unacknowledged TARGET_ALERT sightings — see
// Alternative_Identifier's alerts_service.py for why this is a poll
// queue rather than an outbound push/email/SMS notification (no such
// infrastructure/credentials exist yet).

export type PendingAlert = {
  id: number;
  person_type: string;
  person_identifier: string | null;
  full_name: string | null;
  reason: string | null;
  entrance: string | null;
  recognition_score: number | null;
  decision: string | null;
  liveness_score: number | null;
  timestamp: string;
};

export function getPendingAlerts(token: string) {
  return request<PendingAlert[]>("/alerts/pending", undefined, token);
}

export function acknowledgeAlert(accessLogId: number, token: string) {
  return request(
    `/alerts/${accessLogId}/acknowledge`,
    { method: "PATCH" },
    token
  );
}

// ============================================================
// SMARTACCESS: INVESTIGATIONS (docs/PRD.md §6.3a, §8)
// ============================================================
//
// Same dashboard/role scope as the watchlist above — a lightweight
// case file with an append-only note timeline, optionally tied to
// one watchlist target.

export type InvestigationNote = {
  id: number;
  case_id: string;
  author: string | null;
  note: string;
  created_at: string;
};

export type InvestigationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Investigation = {
  case_id: string;
  title: string;
  description: string | null;
  target_id: string | null;
  status: string;
  severity: InvestigationSeverity;
  assigned_to: string | null;
  opened_by: string | null;
  opened_at: string;
  closed_by: string | null;
  closed_at: string | null;
};

export type LinkedTarget = {
  target_id: string;
  full_name: string | null;
  status: string | null;
};

export type LinkedUnknown = {
  unknown_id: string;
  status: string | null;
  detected_at: string | null;
};

export type InvestigationWithNotes = Investigation & {
  notes: InvestigationNote[];
  linked_targets: LinkedTarget[];
  linked_unknowns: LinkedUnknown[];
};

export function getInvestigations(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<Investigation[]>(`/investigations${query}`, undefined, token);
}

export function createInvestigation(
  fields: {
    title: string;
    description?: string;
    target_id?: string;
    severity?: InvestigationSeverity;
    assigned_to?: string;
  },
  token: string
) {
  return postJson<InvestigationWithNotes>("/investigations", fields, token);
}

export function updateInvestigation(
  caseId: string,
  fields: {
    title?: string;
    description?: string;
    severity?: InvestigationSeverity;
    assigned_to?: string;
  },
  token: string
) {
  return request<InvestigationWithNotes>(
    `/investigations/${encodeURIComponent(caseId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    },
    token
  );
}

export function getInvestigation(caseId: string, token: string) {
  return request<InvestigationWithNotes>(
    `/investigations/${encodeURIComponent(caseId)}`,
    undefined,
    token
  );
}

export function linkInvestigationTarget(
  caseId: string,
  targetId: string,
  token: string
) {
  return request<InvestigationWithNotes>(
    `/investigations/${encodeURIComponent(caseId)}/targets`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: targetId }),
    },
    token
  );
}

export function unlinkInvestigationTarget(
  caseId: string,
  targetId: string,
  token: string
) {
  return request(
    `/investigations/${encodeURIComponent(caseId)}/targets/${encodeURIComponent(targetId)}`,
    { method: "DELETE" },
    token
  );
}

export function linkInvestigationUnknown(
  caseId: string,
  unknownId: string,
  token: string
) {
  return request<InvestigationWithNotes>(
    `/investigations/${encodeURIComponent(caseId)}/unknowns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unknown_id: unknownId }),
    },
    token
  );
}

export function unlinkInvestigationUnknown(
  caseId: string,
  unknownId: string,
  token: string
) {
  return request(
    `/investigations/${encodeURIComponent(caseId)}/unknowns/${encodeURIComponent(unknownId)}`,
    { method: "DELETE" },
    token
  );
}

export function addInvestigationNote(
  caseId: string,
  note: string,
  token: string
) {
  return request<InvestigationWithNotes>(
    `/investigations/${encodeURIComponent(caseId)}/notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    },
    token
  );
}

export function closeInvestigation(caseId: string, token: string) {
  return request(
    `/investigations/${encodeURIComponent(caseId)}/close`,
    { method: "PATCH" },
    token
  );
}

export function reopenInvestigation(caseId: string, token: string) {
  return request(
    `/investigations/${encodeURIComponent(caseId)}/reopen`,
    { method: "PATCH" },
    token
  );
}

// ============================================================
// SMARTACCESS: SCENE RECONSTRUCTION (docs/PRD.md §6.3a, §8)
// ============================================================
//
// Same dashboard/role scope as watchlist/investigations above — pick
// a location (an access_logs "entrance", which a checkpoint camera's
// own registered location now populates — see Camera Management)
// and a time window, and see every face access_logs actually
// recognized there during it. Built entirely off existing
// access_logs rows in Alternative_Identifier's scene_service.py; a
// scene's findings get attached to a case via the existing
// investigation note timeline above, not a separate link.

export type SceneCoOccurrence = {
  person_type: string;
  person_identifier: string;
  full_name: string | null;
  closest_gap_seconds: number;
};

export type ScenePerson = {
  person_type: string;
  person_identifier: string;
  full_name: string | null;
  first_seen: string;
  last_seen: string;
  sighting_count: number;
  co_occurring: SceneCoOccurrence[];
};

export type SceneSighting = {
  id: number;
  person_type: string;
  person_identifier: string | null;
  full_name: string | null;
  entrance: string | null;
  recognition_score: number | null;
  decision: string | null;
  liveness_score: number | null;
  timestamp: string;
};

export type SceneResult = {
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  co_occurrence_minutes: number;
  people: ScenePerson[];
  sightings: SceneSighting[];
};

export function getSceneLocations(token: string) {
  return request<string[]>("/scene/locations", undefined, token);
}

export function querySceneReconstruction(
  filters: {
    location?: string;
    startTime?: string;
    endTime?: string;
    coOccurrenceMinutes?: number;
  },
  token: string
) {
  const params = new URLSearchParams();
  if (filters.location) params.set("location", filters.location);
  if (filters.startTime) params.set("start_time", filters.startTime);
  if (filters.endTime) params.set("end_time", filters.endTime);
  if (filters.coOccurrenceMinutes != null)
    params.set("co_occurrence_minutes", String(filters.coOccurrenceMinutes));
  const query = params.toString();

  return request<SceneResult>(
    `/scene/query${query ? `?${query}` : ""}`,
    undefined,
    token
  );
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
