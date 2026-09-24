"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, enroll, login } from "@/lib/api";
import {
  decryptSession,
  encryptSession,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from "@/lib/session";

export type FormState = {
  error?: string;
  message?: string;
} | undefined;

const DASHBOARD_LABELS: Record<string, string> = {
  original_admin_dashboard: "Original Admin",
  security_admin_dashboard: "Security Admin",
  timetabling_admin_dashboard: "Timetabling Admin",
  dean_admin_dashboard: "Dean of School",
  enrollment_dashboard: "Enrollment (Temporary Admin)",
  guard_dashboard: "Guard",
};

export async function loginAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  let result;

  try {
    result = await login(username, password);
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  if (!result.dashboard || result.dashboard === "smartattendance_app") {
    // Students and lecturers belong in the SmartAttendance app, not
    // this web platform (docs/PRD.md §4) — there is nothing for
    // them to land on here.
    return {
      message:
        result.dashboard === "smartattendance_app"
          ? "This account uses the SmartAttendance app, not this website."
          : "This account has no dashboard on this platform.",
    };
  }

  const session = await encryptSession({
    username: result.username,
    role: result.role,
    adminTier: result.admin_tier,
    dashboard: result.dashboard,
    accessToken: result.access_token,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });

  redirect(`/dashboard/${result.dashboard}`);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function enrollAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const adminTier = String(formData.get("admin_tier") ?? "").trim();
  const linkedPersonId = String(
    formData.get("linked_person_id") ?? ""
  ).trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!username || !password || !email || !role) {
    return { error: "Username, password, email, and role are required." };
  }

  if (role === "GUARD" && !location) {
    return { error: "Guards require a location (checkpoint)." };
  }

  const cookieStore = await cookies();
  const session = await decryptSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  if (!session || session.role !== "ADMIN") {
    // Mirrors the backend: POST /enroll requires an ADMIN
    // access_token (src/api/deps.py in Alternative_Identifier).
    return {
      error: "You must be signed in as an Admin to enroll a new user.",
    };
  }

  try {
    const result = await enroll(
      {
        username,
        password,
        email,
        role,
        admin_tier: role === "ADMIN" ? adminTier : undefined,
        linked_person_id: linkedPersonId || undefined,
        location: role === "GUARD" ? location : undefined,
      },
      session.accessToken
    );

    const dashboardLabel = result.dashboard
      ? (DASHBOARD_LABELS[result.dashboard] ?? result.dashboard)
      : "no dashboard (SmartAttendance app or none)";

    return {
      message: `Created ${result.username} (${result.role}${
        result.admin_tier ? ` / ${result.admin_tier}` : ""
      }) — routes to: ${dashboardLabel}.`,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: "Something went wrong. Please try again." };
  }
}
