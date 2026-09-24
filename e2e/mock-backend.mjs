// A minimal stand-in for Alternative_Identifier's FastAPI backend,
// used only by the Playwright suite under e2e/*.spec.ts. Mirrors
// the shape of every endpoint src/lib/api.ts calls — not the real
// backend's validation/business logic, just enough for the web
// platform's own routing/session/UI behavior to be exercised
// end-to-end without a live Python backend.
import { createServer } from "node:http";

const PORT = 8000;

const ACCOUNTS = {
  original1: { password: "correct", role: "ADMIN", admin_tier: "ORIGINAL", dashboard: "original_admin_dashboard" },
  security1: { password: "correct", role: "ADMIN", admin_tier: "SECURITY", dashboard: "security_admin_dashboard" },
  tt1: { password: "correct", role: "ADMIN", admin_tier: "TIMETABLING", dashboard: "timetabling_admin_dashboard" },
  dean1: { password: "correct", role: "ADMIN", admin_tier: "DEAN", dashboard: "dean_admin_dashboard" },
  temp1: { password: "correct", role: "ADMIN", admin_tier: "TEMPORARY", dashboard: "enrollment_dashboard" },
  guard1: { password: "correct", role: "GUARD", admin_tier: null, dashboard: "guard_dashboard" },
};

const ORIGINAL_TOKENS = Object.fromEntries(
  Object.entries(ACCOUNTS).map(([username, account]) => [
    `${username}-token`,
    { username, role: account.role, admin_tier: account.admin_tier },
  ])
);

// A plain object whose keys /__revoke can delete (to simulate the
// backend rejecting an otherwise-still-valid session's access_token
// — see e2e/session-expiry.spec.ts) and /__reset restores.
const TOKENS = { ...ORIGINAL_TOKENS };

let state;

function resetState() {
  for (const key of Object.keys(TOKENS)) delete TOKENS[key];
  Object.assign(TOKENS, ORIGINAL_TOKENS);

  state = {
    timetable: [],
    nextTimetableId: 1,
    units: [],
    nextUnitId: 1,
    cameras: [],
    lecturers: [],
    accessLogs: [
      {
        id: 1,
        person_type: "STUDENT",
        person_identifier: "S1",
        entrance: "Main Gate",
        recognition_score: 0.91,
        liveness_score: 0.8,
        decision: "VERIFIED",
        guard_id: null,
        false_positive: false,
        false_positive_reason: null,
        timestamp: "2026-09-13T08:00:00",
      },
    ],
    students: [],
    guests: [],
    pendingUnknowns: [],
    enrolled: [],
    watchlist: [],
    nextWatchlistSeq: 1,
    investigations: [],
    nextCaseSeq: 1,
    investigationTargets: [],
    investigationUnknowns: [],
  };
}
resetState();

// Mirrors investigation_service.py's get_case(): a case's "primary"
// target_id plus every investigation_targets/investigation_unknowns
// link row, each resolved against the current watchlist/pendingUnknowns
// state rather than frozen at link time.
function resolveCase(investigation) {
  const targetIds = [];
  if (investigation.target_id) targetIds.push(investigation.target_id);
  for (const row of state.investigationTargets) {
    if (row.case_id === investigation.case_id && !targetIds.includes(row.target_id)) {
      targetIds.push(row.target_id);
    }
  }
  const linked_targets = targetIds.map((targetId) => {
    const target = state.watchlist.find((t) => t.target_id === targetId);
    return {
      target_id: targetId,
      full_name: target ? target.full_name : null,
      status: target ? target.status : null,
    };
  });

  const linked_unknowns = state.investigationUnknowns
    .filter((row) => row.case_id === investigation.case_id)
    .map((row) => {
      const unknown = state.pendingUnknowns.find(
        (u) => u.unknown_id === row.unknown_id
      );
      return {
        unknown_id: row.unknown_id,
        status: unknown ? unknown.status : null,
        detected_at: unknown ? unknown.detected_at : null,
      };
    });

  return { ...investigation, linked_targets, linked_unknowns };
}

function auth(req, res, allowedRoles) {
  const header = req.headers["authorization"] || "";
  if (!header.startsWith("Bearer ")) {
    reply(res, 401, { detail: "Missing or malformed Authorization header" });
    return null;
  }
  const token = header.slice("Bearer ".length);
  const user = TOKENS[token];
  if (!user) {
    reply(res, 401, { detail: "Invalid or expired access token" });
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    reply(res, 403, { detail: "Insufficient permissions" });
    return null;
  }
  return user;
}

// Every /watchlist and /investigations endpoint on the real backend
// is gated to SECURITY/ORIGINAL admin tiers specifically (not just
// any ADMIN) — see src/api/main.py's require_admin_tier calls.
function authSmartAccess(req, res) {
  const user = auth(req, res, ["ADMIN"]);
  if (!user) return null;
  if (!["SECURITY", "ORIGINAL"].includes(user.admin_tier)) {
    reply(res, 403, { detail: "forbidden" });
    return null;
  }
  return user;
}

function reply(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

// POST /watchlist accepts an optional file upload alongside plain
// fields on the real backend, which makes lib/api.ts's postForm()
// send it as multipart/form-data (even with zero files attached) —
// mirror that here with a minimal text-field-only multipart parser,
// since this mock has no framework to do it for us.
async function readMultipartFields(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) return {};

  const boundary = `--${boundaryMatch[1]}`;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf-8");

  const fields = {};
  for (const part of raw.split(boundary)) {
    const nameMatch = part.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const valueStart = part.indexOf("\r\n\r\n");
    if (valueStart === -1) continue;
    fields[nameMatch[1]] = part.slice(valueStart + 4).replace(/\r\n$/, "");
  }
  return fields;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  // Test-only reset hook so each spec file starts from clean state.
  if (path === "/__reset" && method === "POST") {
    resetState();
    reply(res, 200, { success: true });
    return;
  }

  // Test-only fixture-loading hook — merges arbitrary arrays into
  // state (e.g. { students: [...], cameras: [...] }) so a spec can
  // set up data the mock has no real "create" flow for (like
  // students, who are normally created via facial enrollment).
  if (path === "/__seed" && method === "POST") {
    const body = await readBody(req);
    Object.assign(state, body);
    reply(res, 200, { success: true });
    return;
  }

  // Test-only: simulates the backend rejecting a token whose owning
  // session cookie is otherwise still valid (e.g. a JWT_SECRET
  // rotation) — see e2e/session-expiry.spec.ts.
  if (path === "/__revoke" && method === "POST") {
    const body = await readBody(req);
    delete TOKENS[body.token];
    reply(res, 200, { success: true });
    return;
  }

  if (path === "/login" && method === "POST") {
    const body = await readBody(req);
    const account = ACCOUNTS[body.username];
    if (account && account.password === body.password) {
      reply(res, 200, {
        username: body.username,
        email: `${body.username}@example.com`,
        role: account.role,
        admin_tier: account.admin_tier,
        dashboard: account.dashboard,
        access_token: `${body.username}-token`,
      });
      return;
    }
    reply(res, 401, { detail: "Invalid credentials" });
    return;
  }

  if (path === "/students" && method === "GET") {
    if (!auth(req, res, ["ADMIN"])) return;
    reply(res, 200, state.students);
    return;
  }

  // POST /enroll/student-face — the step that actually creates the
  // students table row (see enrollment_service.py on the real
  // backend); doesn't run any real face detection here, just checks
  // a "files" part was attached, mirroring the real endpoint's "at
  // least one reference photo is required" check.
  if (path === "/enroll/student-face" && method === "POST") {
    if (!auth(req, res, ["ADMIN"])) return;
    const fields = await readMultipartFields(req);
    if (!fields.files) {
      return reply(res, 400, {
        detail: "At least one reference photo is required.",
      });
    }
    if (
      state.students.some(
        (s) =>
          s.student_id === fields.student_id ||
          s.admission_number === fields.admission_number
      )
    ) {
      return reply(res, 400, {
        detail:
          "Could not enroll student — student_id or admission_number may already exist",
      });
    }
    const student = {
      student_id: fields.student_id,
      full_name: fields.full_name,
      admission_number: fields.admission_number,
      hostel: fields.hostel,
      room: fields.room,
      department: fields.department || null,
      course: fields.course || null,
      year: fields.year ? Number(fields.year) : null,
      semester: fields.semester ? Number(fields.semester) : null,
      embedding_file: `${fields.student_id}.npy`,
    };
    state.students.push(student);
    reply(res, 200, { ...student, samples_used: 1, samples_skipped: 0 });
    return;
  }

  if (path === "/guests" && method === "GET") {
    if (!auth(req, res, ["ADMIN"])) return;
    reply(res, 200, state.guests);
    return;
  }

  if (path === "/access-logs" && method === "GET") {
    if (!auth(req, res, ["ADMIN", "GUARD"])) return;
    reply(res, 200, state.accessLogs);
    return;
  }

  if (path.match(/^\/access-logs\/\d+\/false-positive$/) && method === "PATCH") {
    if (!auth(req, res, ["ADMIN", "GUARD"])) return;
    const id = Number(path.split("/")[2]);
    const body = await readBody(req);
    const log = state.accessLogs.find((l) => l.id === id);
    if (!log) return reply(res, 404, { detail: "not found" });
    log.false_positive = true;
    log.false_positive_reason = body.reason;
    reply(res, 200, { success: true });
    return;
  }

  if (path === "/guard/pending" && method === "GET") {
    if (!auth(req, res, ["ADMIN", "GUARD"])) return;
    reply(res, 200, {
      total_pending: state.pendingUnknowns.length,
      unknown_persons: state.pendingUnknowns,
    });
    return;
  }

  if (path.match(/^\/guard\/(admit|reject)\//) && method === "POST") {
    if (!auth(req, res, ["ADMIN", "GUARD"])) return;
    const [, , action, unknownId] = path.split("/");
    state.pendingUnknowns = state.pendingUnknowns.filter(
      (u) => u.unknown_id !== unknownId
    );
    reply(res, 200, {
      success: true,
      unknown_id: unknownId,
      status: action === "admit" ? "AG" : "REJECTED",
      message: action === "admit" ? "Guest admitted" : "Access rejected",
    });
    return;
  }

  if (path === "/units" && method === "GET") {
    if (!auth(req, res, ["ADMIN", "LECTURER"])) return;
    const department = url.searchParams.get("department");
    const course = url.searchParams.get("course");
    const year = url.searchParams.get("year");
    const semester = url.searchParams.get("semester");
    const lecturerId = url.searchParams.get("lecturer_id");
    const unclaimed = url.searchParams.get("unclaimed") === "true";
    let results = state.units;
    if (department) results = results.filter((u) => u.department === department);
    if (course) results = results.filter((u) => u.course === course);
    if (year) results = results.filter((u) => u.year === Number(year));
    if (semester) results = results.filter((u) => u.semester === Number(semester));
    if (lecturerId) results = results.filter((u) => u.lecturer_id === lecturerId);
    if (unclaimed) results = results.filter((u) => !u.lecturer_id);
    reply(res, 200, results);
    return;
  }

  if (path === "/units" && method === "POST") {
    if (!auth(req, res, ["ADMIN"])) return;
    const body = await readBody(req);
    if (state.units.some((u) => u.unit_code === body.unit_code)) {
      return reply(res, 400, { detail: "unit_code already exists" });
    }
    const unit = {
      id: state.nextUnitId++,
      department: null,
      lecturer_id: null,
      created_by: "tt1",
      created_at: "2026-09-13T00:00:00",
      ...body,
    };
    state.units.push(unit);
    reply(res, 200, unit);
    return;
  }

  if (path.match(/^\/units\/\d+\/lecturer$/) && method === "PATCH") {
    if (!auth(req, res, ["ADMIN"])) return;
    const id = Number(path.split("/")[2]);
    const body = await readBody(req);
    const unit = state.units.find((u) => u.id === id);
    if (!unit) return reply(res, 404, { detail: "not found" });
    unit.lecturer_id = body.lecturer_id ?? null;
    reply(res, 200, unit);
    return;
  }

  if (path.match(/^\/units\/\d+\/(claim|unclaim)$/) && method === "PATCH") {
    if (!auth(req, res, ["LECTURER"])) return;
    const id = Number(path.split("/")[2]);
    const unit = state.units.find((u) => u.id === id);
    if (!unit) return reply(res, 404, { detail: "not found" });
    unit.lecturer_id = path.endsWith("/claim") ? "L1" : null;
    reply(res, 200, unit);
    return;
  }

  if (path === "/timetable" && method === "GET") {
    if (!auth(req, res, ["ADMIN", "STUDENT", "LECTURER"])) return;
    const course = url.searchParams.get("course");
    const year = url.searchParams.get("year");
    const department = url.searchParams.get("department");
    const semester = url.searchParams.get("semester");
    const lecturerId = url.searchParams.get("lecturer_id");
    const unitId = url.searchParams.get("unit_id");
    let results = state.timetable;
    if (course) results = results.filter((e) => e.course === course);
    if (year) results = results.filter((e) => e.year === Number(year));
    if (department) results = results.filter((e) => e.department === department);
    if (semester) results = results.filter((e) => e.semester === Number(semester));
    if (lecturerId) results = results.filter((e) => e.lecturer_id === lecturerId);
    if (unitId) results = results.filter((e) => e.unit_id === Number(unitId));
    reply(res, 200, results);
    return;
  }

  if (path === "/timetable" && method === "POST") {
    if (!auth(req, res, ["ADMIN"])) return;
    const body = await readBody(req);
    const unit = state.units.find((u) => u.id === body.unit_id);
    if (!unit) return reply(res, 400, { detail: "Unknown unit_id" });
    const lecturer = state.lecturers.find(
      (l) => l.lecturer_id === unit.lecturer_id
    );
    const entry = {
      id: state.nextTimetableId++,
      unit_id: unit.id,
      unit_code: unit.unit_code,
      unit_name: unit.unit_name,
      course: unit.course,
      year: unit.year,
      department: unit.department,
      semester: unit.semester,
      lecturer_id: unit.lecturer_id,
      facilitator: lecturer ? lecturer.full_name : null,
      day_of_week: body.day_of_week.toUpperCase(),
      start_time: body.start_time,
      end_time: body.end_time,
      venue: body.venue,
      status: "ON",
      created_by: "tt1",
      created_at: "2026-09-13T00:00:00",
    };
    state.timetable.push(entry);
    reply(res, 200, entry);
    return;
  }

  if (path.match(/^\/timetable\/\d+\/status$/) && method === "PATCH") {
    if (!auth(req, res, ["ADMIN"])) return;
    const id = Number(path.split("/")[2]);
    const body = await readBody(req);
    const entry = state.timetable.find((e) => e.id === id);
    if (!entry) return reply(res, 404, { detail: "not found" });
    entry.status = body.status.toUpperCase();
    reply(res, 200, { success: true });
    return;
  }

  if (path.match(/^\/timetable\/\d+$/) && method === "DELETE") {
    if (!auth(req, res, ["ADMIN"])) return;
    const id = Number(path.split("/")[2]);
    const before = state.timetable.length;
    state.timetable = state.timetable.filter((e) => e.id !== id);
    if (state.timetable.length === before) return reply(res, 404, { detail: "not found" });
    reply(res, 200, { success: true });
    return;
  }

  if (path === "/cameras" && method === "GET") {
    if (!auth(req, res, ["ADMIN"])) return;
    const cameraType = url.searchParams.get("camera_type");
    const department = url.searchParams.get("department");
    let results = state.cameras;
    if (cameraType) results = results.filter((c) => c.camera_type === cameraType);
    if (department) results = results.filter((c) => c.department === department);
    reply(res, 200, results);
    return;
  }

  if (path === "/cameras" && method === "POST") {
    const user = auth(req, res, ["ADMIN"]);
    if (!user) return;
    if (user.admin_tier !== "ORIGINAL") return reply(res, 403, { detail: "forbidden" });
    const body = await readBody(req);
    const camera = {
      status: "OFFLINE",
      enabled: true,
      location: null,
      department: null,
      source: null,
      created_by: user.username,
      created_at: "2026-09-13T00:00:00",
      ...body,
      camera_type: body.camera_type.toUpperCase(),
    };
    state.cameras.push(camera);
    reply(res, 200, camera);
    return;
  }

  if (path.match(/^\/cameras\/[^/]+\/status$/) && method === "PATCH") {
    const user = auth(req, res, ["ADMIN"]);
    if (!user) return;
    if (!["ORIGINAL", "SECURITY"].includes(user.admin_tier)) return reply(res, 403, { detail: "forbidden" });
    const cameraId = decodeURIComponent(path.split("/")[2]);
    const body = await readBody(req);
    const camera = state.cameras.find((c) => c.camera_id === cameraId);
    if (!camera) return reply(res, 404, { detail: "not found" });
    camera.status = body.status.toUpperCase();
    reply(res, 200, { success: true });
    return;
  }

  if (path.match(/^\/cameras\/[^/]+$/) && method === "PATCH") {
    const user = auth(req, res, ["ADMIN"]);
    if (!user) return;
    if (!["ORIGINAL", "SECURITY"].includes(user.admin_tier)) return reply(res, 403, { detail: "forbidden" });
    const cameraId = decodeURIComponent(path.split("/")[2]);
    const body = await readBody(req);
    const camera = state.cameras.find((c) => c.camera_id === cameraId);
    if (!camera) return reply(res, 404, { detail: "not found" });
    Object.assign(camera, body);
    reply(res, 200, { success: true });
    return;
  }

  if (path.match(/^\/cameras\/[^/]+$/) && method === "DELETE") {
    const user = auth(req, res, ["ADMIN"]);
    if (!user) return;
    if (user.admin_tier !== "ORIGINAL") return reply(res, 403, { detail: "forbidden" });
    const cameraId = decodeURIComponent(path.split("/")[2]);
    const before = state.cameras.length;
    state.cameras = state.cameras.filter((c) => c.camera_id !== cameraId);
    if (state.cameras.length === before) return reply(res, 404, { detail: "not found" });
    reply(res, 200, { success: true });
    return;
  }

  if (path === "/lecturers" && method === "GET") {
    if (!auth(req, res, ["ADMIN"])) return;
    reply(res, 200, state.lecturers);
    return;
  }

  if (path === "/lecturers" && method === "POST") {
    if (!auth(req, res, ["ADMIN"])) return;
    const body = await readBody(req);
    if (state.lecturers.some((l) => l.lecturer_id === body.lecturer_id)) {
      return reply(res, 400, { detail: "lecturer_id already exists" });
    }
    const lecturer = { department: null, ...body };
    state.lecturers.push(lecturer);
    reply(res, 200, lecturer);
    return;
  }

  if (path === "/dean/roster" && method === "GET") {
    if (!auth(req, res, ["ADMIN"])) return;
    const department = url.searchParams.get("department");
    const roster = department
      ? state.students.filter((s) => s.department === department)
      : state.students;
    reply(res, 200, roster);
    return;
  }

  if (path === "/dean/summary" && method === "GET") {
    if (!auth(req, res, ["ADMIN"])) return;
    const department = url.searchParams.get("department");
    const roster = department
      ? state.students.filter((s) => s.department === department)
      : state.students;
    const timetable = department
      ? state.timetable.filter((e) => e.department === department)
      : state.timetable;

    const counts = {};
    for (const s of roster) {
      const key = `${s.course}::${s.year}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const roster_by_classification = Object.entries(counts).map(([key, count]) => {
      const [course, year] = key.split("::");
      return { course, year: Number(year), student_count: count };
    });

    reply(res, 200, {
      department,
      total_students: roster.length,
      roster_by_classification,
      total_units: new Set(timetable.map((e) => e.unit_name)).size,
      total_active_lectures: timetable.filter((e) => e.status === "ON").length,
      total_timetable_entries: timetable.length,
    });
    return;
  }

  if (path === "/analytics/summary" && method === "GET") {
    if (!auth(req, res, ["ADMIN"])) return;
    reply(res, 200, {
      total_access_attempts: state.accessLogs.length,
      counts_by_decision: { VERIFIED: state.accessLogs.length },
      movement_by_entrance: { "Main Gate": state.accessLogs.length },
      movement_by_person_type: { STUDENT: state.accessLogs.length },
      verified_count: state.accessLogs.length,
      false_positive_count: state.accessLogs.filter((l) => l.false_positive).length,
      false_positive_rate: 0,
      average_recognition_score: 0.9,
      average_liveness_score: 0.8,
    });
    return;
  }

  if (path === "/enroll" && method === "POST") {
    if (!auth(req, res, ["ADMIN"])) return;
    const body = await readBody(req);
    const dashboards = {
      STUDENT: "smartattendance_app",
      LECTURER: "smartattendance_app",
      GUARD: "guard_dashboard",
      STAFF: "none",
      ADMIN: {
        ORIGINAL: "original_admin_dashboard",
        SECURITY: "security_admin_dashboard",
        TIMETABLING: "timetabling_admin_dashboard",
        DEAN: "dean_admin_dashboard",
        TEMPORARY: "enrollment_dashboard",
      }[body.admin_tier],
    };
    const record = {
      username: body.username,
      email: body.email,
      role: body.role,
      admin_tier: body.admin_tier || null,
      dashboard: dashboards[body.role] ?? null,
    };
    state.enrolled.push(record);
    reply(res, 200, record);
    return;
  }

  if (path === "/watchlist" && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const status = url.searchParams.get("status");
    let results = state.watchlist;
    if (status) results = results.filter((t) => t.status === status.toUpperCase());
    reply(res, 200, results);
    return;
  }

  if (path === "/watchlist" && method === "POST") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const fields = await readMultipartFields(req);

    let fullName = fields.full_name || null;
    let linkedStudentId = null;
    let embeddingFile = null;

    if (fields.admission_number) {
      const student = state.students.find(
        (s) => s.admission_number === fields.admission_number
      );
      if (!student) {
        return reply(res, 400, {
          detail: `No enrolled student found with admission_number: ${fields.admission_number}`,
        });
      }
      fullName = student.full_name;
      linkedStudentId = student.student_id;
      embeddingFile = `${student.student_id}.npy`;
    }

    if (!fullName) {
      return reply(res, 400, {
        detail: "Either full_name or admission_number is required.",
      });
    }

    const target = {
      target_id: `TGT-${String(state.nextWatchlistSeq++).padStart(4, "0")}`,
      full_name: fullName,
      description: fields.description || null,
      reason: fields.reason || null,
      status: "ACTIVE",
      embedding_file: embeddingFile,
      linked_student_id: linkedStudentId,
      created_by: user.username,
      created_at: "2026-09-13T00:00:00",
      resolved_by: null,
      resolved_at: null,
    };
    state.watchlist.push(target);
    reply(res, 200, target);
    return;
  }

  if (path.match(/^\/watchlist\/[^/]+\/sightings$/) && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const targetId = decodeURIComponent(path.split("/")[2]);
    const sightings = state.accessLogs.filter(
      (log) => log.person_type === "TARGET" && log.person_identifier === targetId
    );
    reply(res, 200, sightings);
    return;
  }

  if (path.match(/^\/watchlist\/[^/]+\/frequency$/) && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const targetId = decodeURIComponent(path.split("/")[2]);
    const target = state.watchlist.find((t) => t.target_id === targetId);
    if (!target) return reply(res, 404, { detail: "Target not found" });
    const counts = new Map();
    for (const log of state.accessLogs) {
      if (log.person_type !== "TARGET" || log.person_identifier !== targetId) continue;
      const entrance = log.entrance || "Unknown location";
      counts.set(entrance, (counts.get(entrance) || 0) + 1);
    }
    const frequency = [...counts.entries()]
      .map(([entrance, count]) => ({ entrance, count }))
      .sort((a, b) => b.count - a.count);
    reply(res, 200, frequency);
    return;
  }

  if (path.match(/^\/watchlist\/[^/]+\/resolve$/) && method === "PATCH") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const targetId = decodeURIComponent(path.split("/")[2]);
    const target = state.watchlist.find((t) => t.target_id === targetId);
    if (!target) return reply(res, 404, { detail: "not found" });
    target.status = "RESOLVED";
    target.resolved_by = user.username;
    target.resolved_at = "2026-09-13T00:00:00";
    reply(res, 200, { success: true });
    return;
  }

  if (path.match(/^\/watchlist\/[^/]+\/reactivate$/) && method === "PATCH") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const targetId = decodeURIComponent(path.split("/")[2]);
    const target = state.watchlist.find((t) => t.target_id === targetId);
    if (!target) return reply(res, 404, { detail: "not found" });
    target.status = "ACTIVE";
    target.resolved_by = null;
    target.resolved_at = null;
    reply(res, 200, { success: true });
    return;
  }

  if (path === "/investigations" && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const status = url.searchParams.get("status");
    let results = state.investigations;
    if (status) results = results.filter((c) => c.status === status.toUpperCase());
    reply(res, 200, results);
    return;
  }

  if (path === "/investigations" && method === "POST") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const body = await readBody(req);
    const investigation = {
      case_id: `CASE-${String(state.nextCaseSeq++).padStart(4, "0")}`,
      title: body.title,
      description: body.description || null,
      target_id: body.target_id || null,
      status: "OPEN",
      severity: (body.severity || "MEDIUM").toUpperCase(),
      assigned_to: body.assigned_to || null,
      opened_by: user.username,
      opened_at: "2026-09-13T00:00:00",
      closed_by: null,
      closed_at: null,
      notes: [],
    };
    state.investigations.push(investigation);
    reply(res, 200, resolveCase(investigation));
    return;
  }

  if (path.match(/^\/investigations\/[^/]+$/) && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    reply(res, 200, resolveCase(investigation));
    return;
  }

  if (path.match(/^\/investigations\/[^/]+$/) && method === "PATCH") {
    if (!authSmartAccess(req, res)) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    const body = await readBody(req);
    if (body.title !== undefined) investigation.title = body.title;
    if (body.description !== undefined) investigation.description = body.description;
    if (body.severity !== undefined) investigation.severity = body.severity.toUpperCase();
    if (body.assigned_to !== undefined) investigation.assigned_to = body.assigned_to || null;
    reply(res, 200, resolveCase(investigation));
    return;
  }

  if (path.match(/^\/investigations\/[^/]+\/notes$/) && method === "POST") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    const body = await readBody(req);
    investigation.notes.push({
      id: investigation.notes.length + 1,
      case_id: caseId,
      author: user.username,
      note: body.note,
      created_at: "2026-09-13T00:00:00",
    });
    reply(res, 200, resolveCase(investigation));
    return;
  }

  if (path.match(/^\/investigations\/[^/]+\/targets$/) && method === "POST") {
    if (!authSmartAccess(req, res)) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    const body = await readBody(req);
    const target = state.watchlist.find((t) => t.target_id === body.target_id);
    if (!target) return reply(res, 404, { detail: `Unknown target_id: ${body.target_id}` });
    const alreadyLinked = state.investigationTargets.some(
      (row) => row.case_id === caseId && row.target_id === body.target_id
    );
    if (!alreadyLinked) {
      state.investigationTargets.push({ case_id: caseId, target_id: body.target_id });
    }
    reply(res, 200, resolveCase(investigation));
    return;
  }

  if (path.match(/^\/investigations\/[^/]+\/targets\/[^/]+$/) && method === "DELETE") {
    if (!authSmartAccess(req, res)) return;
    const [, , rawCaseId, , rawTargetId] = path.split("/");
    const caseId = decodeURIComponent(rawCaseId);
    const targetId = decodeURIComponent(rawTargetId);

    // Mirrors investigation_service.py's unlink_target(): the case's
    // "primary" target_id isn't a investigation_targets row, so it
    // has to be handled here too or unlinking it would silently
    // no-op.
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (investigation && investigation.target_id === targetId) {
      investigation.target_id = null;
      reply(res, 200, { success: true });
      return;
    }

    const before = state.investigationTargets.length;
    state.investigationTargets = state.investigationTargets.filter(
      (row) => !(row.case_id === caseId && row.target_id === targetId)
    );
    if (state.investigationTargets.length === before) {
      return reply(res, 404, { detail: "not linked" });
    }
    reply(res, 200, { success: true });
    return;
  }

  if (path.match(/^\/investigations\/[^/]+\/unknowns$/) && method === "POST") {
    if (!authSmartAccess(req, res)) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    const body = await readBody(req);
    const unknown = state.pendingUnknowns.find((u) => u.unknown_id === body.unknown_id);
    if (!unknown) return reply(res, 404, { detail: `Unknown unknown_id: ${body.unknown_id}` });
    const alreadyLinked = state.investigationUnknowns.some(
      (row) => row.case_id === caseId && row.unknown_id === body.unknown_id
    );
    if (!alreadyLinked) {
      state.investigationUnknowns.push({ case_id: caseId, unknown_id: body.unknown_id });
    }
    reply(res, 200, resolveCase(investigation));
    return;
  }

  if (path.match(/^\/investigations\/[^/]+\/unknowns\/[^/]+$/) && method === "DELETE") {
    if (!authSmartAccess(req, res)) return;
    const [, , rawCaseId, , rawUnknownId] = path.split("/");
    const caseId = decodeURIComponent(rawCaseId);
    const unknownId = decodeURIComponent(rawUnknownId);
    const before = state.investigationUnknowns.length;
    state.investigationUnknowns = state.investigationUnknowns.filter(
      (row) => !(row.case_id === caseId && row.unknown_id === unknownId)
    );
    if (state.investigationUnknowns.length === before) {
      return reply(res, 404, { detail: "not linked" });
    }
    reply(res, 200, { success: true });
    return;
  }

  if (path.match(/^\/investigations\/[^/]+\/close$/) && method === "PATCH") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    investigation.status = "CLOSED";
    investigation.closed_by = user.username;
    investigation.closed_at = "2026-09-13T00:00:00";
    reply(res, 200, { success: true });
    return;
  }

  if (path.match(/^\/investigations\/[^/]+\/reopen$/) && method === "PATCH") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    investigation.status = "OPEN";
    investigation.closed_by = null;
    investigation.closed_at = null;
    reply(res, 200, { success: true });
    return;
  }

  // Target alerts — mirrors alerts_service.py: a poll queue of
  // unacknowledged TARGET_ALERT access_logs rows.
  if (path === "/alerts/pending" && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const pending = state.accessLogs
      .filter((log) => log.decision === "TARGET_ALERT" && !log.alert_acknowledged)
      .map((log) => {
        const target = state.watchlist.find((t) => t.target_id === log.person_identifier);
        return {
          ...log,
          full_name: target ? target.full_name : null,
          reason: target ? target.reason : null,
        };
      })
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : b.id - a.id));
    reply(res, 200, pending);
    return;
  }

  if (path.match(/^\/alerts\/[^/]+\/acknowledge$/) && method === "PATCH") {
    const user = authSmartAccess(req, res);
    if (!user) return;
    const alertId = Number(decodeURIComponent(path.split("/")[2]));
    const log = state.accessLogs.find(
      (entry) => entry.id === alertId && entry.decision === "TARGET_ALERT" && !entry.alert_acknowledged
    );
    if (!log) return reply(res, 404, { detail: "No pending alert with that id" });
    log.alert_acknowledged = true;
    log.alert_acknowledged_by = user.username;
    log.alert_acknowledged_at = "2026-09-13T00:00:00";
    reply(res, 200, { success: true });
    return;
  }

  // Scene reconstruction — mirrors scene_service.py: location+time
  // filtered access_logs, with STUDENT/TARGET identifiers resolved to
  // a name (GUEST has none in this schema, same as the real backend).
  if (path === "/scene/locations" && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const locations = [
      ...new Set(state.accessLogs.map((log) => log.entrance).filter(Boolean)),
    ].sort();
    reply(res, 200, locations);
    return;
  }

  if (path === "/scene/query" && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const location = url.searchParams.get("location");
    const startTime = url.searchParams.get("start_time");
    const endTime = url.searchParams.get("end_time");
    const coOccurrenceMinutesParam = url.searchParams.get(
      "co_occurrence_minutes"
    );
    const coOccurrenceMinutes =
      Number(coOccurrenceMinutesParam) > 0
        ? Number(coOccurrenceMinutesParam)
        : 5;

    const resolveName = (personType, personIdentifier) => {
      if (personType === "STUDENT") {
        const student = state.students.find(
          (s) => s.student_id === personIdentifier
        );
        return student ? student.full_name : null;
      }
      if (personType === "TARGET") {
        const target = state.watchlist.find(
          (t) => t.target_id === personIdentifier
        );
        return target ? target.full_name : null;
      }
      return null;
    };

    let rows = [...state.accessLogs].sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0
    );
    if (location) rows = rows.filter((log) => log.entrance === location);
    if (startTime) rows = rows.filter((log) => log.timestamp >= startTime);
    if (endTime) rows = rows.filter((log) => log.timestamp <= endTime);

    const sightings = rows.map((log) => ({
      ...log,
      full_name: resolveName(log.person_type, log.person_identifier),
    }));

    const peopleByKey = new Map();
    for (const sighting of sightings) {
      const key = `${sighting.person_type}:${sighting.person_identifier}`;
      if (!peopleByKey.has(key)) {
        peopleByKey.set(key, {
          person_type: sighting.person_type,
          person_identifier: sighting.person_identifier,
          full_name: sighting.full_name,
          first_seen: sighting.timestamp,
          last_seen: sighting.timestamp,
          sighting_count: 0,
        });
      }
      const person = peopleByKey.get(key);
      person.last_seen = sighting.timestamp;
      person.sighting_count += 1;
    }

    // Co-occurrence: who else was logged at this same location within
    // `coOccurrenceMinutes` of one of this person's own sightings —
    // mirrors Alternative_Identifier's scene_service.py.
    const windowMs = coOccurrenceMinutes * 60 * 1000;
    const bestGapByKey = new Map(
      [...peopleByKey.keys()].map((key) => [key, new Map()])
    );
    for (let i = 0; i < sightings.length; i++) {
      const a = sightings[i];
      const timeA = new Date(a.timestamp).getTime();
      if (Number.isNaN(timeA)) continue;
      const keyA = `${a.person_type}:${a.person_identifier}`;
      for (let j = i + 1; j < sightings.length; j++) {
        const b = sightings[j];
        const timeB = new Date(b.timestamp).getTime();
        if (Number.isNaN(timeB)) continue;
        const keyB = `${b.person_type}:${b.person_identifier}`;
        if (keyA === keyB) continue;
        const gapMs = Math.abs(timeA - timeB);
        if (gapMs > windowMs) continue;
        for (const [first, second] of [
          [keyA, keyB],
          [keyB, keyA],
        ]) {
          const existing = bestGapByKey.get(first).get(second);
          if (existing === undefined || gapMs < existing) {
            bestGapByKey.get(first).set(second, gapMs);
          }
        }
      }
    }
    for (const [key, person] of peopleByKey) {
      person.co_occurring = [...bestGapByKey.get(key).entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([otherKey, gapMs]) => {
          const other = peopleByKey.get(otherKey);
          return {
            person_type: other.person_type,
            person_identifier: other.person_identifier,
            full_name: other.full_name,
            closest_gap_seconds: Math.round(gapMs / 1000),
          };
        });
    }

    reply(res, 200, {
      location: location || null,
      start_time: startTime || null,
      end_time: endTime || null,
      co_occurrence_minutes: coOccurrenceMinutes,
      people: [...peopleByKey.values()],
      sightings,
    });
    return;
  }

  reply(res, 404, { detail: "not found" });
});

server.listen(PORT, () => {
  console.log(`mock backend listening on :${PORT}`);
});
