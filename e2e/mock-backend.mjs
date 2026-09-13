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
  };
}
resetState();

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
      opened_by: user.username,
      opened_at: "2026-09-13T00:00:00",
      closed_by: null,
      closed_at: null,
      notes: [],
    };
    state.investigations.push(investigation);
    reply(res, 200, investigation);
    return;
  }

  if (path.match(/^\/investigations\/[^/]+$/) && method === "GET") {
    if (!authSmartAccess(req, res)) return;
    const caseId = decodeURIComponent(path.split("/")[2]);
    const investigation = state.investigations.find((c) => c.case_id === caseId);
    if (!investigation) return reply(res, 404, { detail: "not found" });
    reply(res, 200, investigation);
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
    reply(res, 200, investigation);
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

  reply(res, 404, { detail: "not found" });
});

server.listen(PORT, () => {
  console.log(`mock backend listening on :${PORT}`);
});
