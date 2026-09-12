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

async function apiRequest<T>(path: string, body: object): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
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

export type LoginResult = {
  username: string;
  email: string;
  role: string;
  admin_tier: string | null;
  dashboard: string | null;
};

export type EnrollResult = LoginResult;

export function login(username: string, password: string) {
  return apiRequest<LoginResult>("/login", { username, password });
}

export function enroll(fields: {
  username: string;
  password: string;
  email: string;
  role: string;
  admin_tier?: string;
  linked_person_id?: string;
}) {
  return apiRequest<EnrollResult>("/enroll", fields);
}
