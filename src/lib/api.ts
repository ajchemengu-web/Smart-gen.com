// Talks to the SmartAccess/recognition-engine backend that lives in
// the Alternative_Identifier repo (src/api/main.py). Server-only —
// this file is never bundled for the client, so API_BASE_URL does
// not need the NEXT_PUBLIC_ prefix.

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
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
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

function postJson<T>(path: string, body: object) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
};

export type EnrollResult = LoginResult;

export function login(username: string, password: string) {
  return postJson<LoginResult>("/login", { username, password });
}

export function enroll(fields: {
  username: string;
  password: string;
  email: string;
  role: string;
  admin_tier?: string;
  linked_person_id?: string;
}) {
  return postJson<EnrollResult>("/enroll", fields);
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

export function getPendingUnknowns() {
  return request<{
    total_pending: number;
    unknown_persons: PendingUnknown[];
  }>("/guard/pending");
}

export function getAccessLogs() {
  return request<AccessLogEntry[]>("/access-logs");
}

export function admitUnknown(unknownId: string) {
  return request(`/guard/admit/${encodeURIComponent(unknownId)}`, {
    method: "POST",
  });
}

export function rejectUnknown(unknownId: string) {
  return request(`/guard/reject/${encodeURIComponent(unknownId)}`, {
    method: "POST",
  });
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

export function getStudents() {
  return request<Student[]>("/students");
}

export function getGuests() {
  return request<Guest[]>("/guests");
}

// ============================================================
// ROUTE HANDLER HELPER
// ============================================================
//
// Shared shape for the Next.js Route Handlers under src/app/api/*
// that proxy these calls to the browser (so the client never talks
// to API_BASE_URL directly).

export function apiErrorResponse(error: unknown) {
  const status = error instanceof ApiError ? error.status || 502 : 502;
  const message =
    error instanceof ApiError ? error.message : "Request failed";
  return { status, body: { detail: message } };
}
