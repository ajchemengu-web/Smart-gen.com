# Smart Gen — Web Platform

The Admin, Guard, and Enrollment web dashboards for Smart Gen
(SmartAccess + SmartAttendance), per `docs/PRD.md`. Built with
Next.js (App Router), deployed on Vercel.

This app is the **web** half of the platform: Admins (all tiers),
Guards, and Enrollment are here. Students and Lecturers use a
separate SmartAttendance app (Flutter) that talks to the same
backend — logging in here with a student/lecturer account will tell
you so rather than showing a dashboard.

## What's here so far

- `/login` — single sign-in surface for every role; the account's
  role/admin_tier determines which dashboard it lands on
  (`docs/PRD.md` §9). On success, sets an encrypted, httpOnly session
  cookie (`src/lib/session.ts`) — there's no session store on the
  backend, so the session is created and verified entirely here.
- `/enroll` — create a login for a Student, Lecturer, Guard, Staff
  member, or Admin (`docs/PRD.md` §5). Admin-only: `src/proxy.ts`
  redirects anyone else away, and the request itself carries the
  signed-in admin's access_token, since the backend's own POST
  /enroll now requires one too.
- `/dashboard/guard_dashboard`, `/dashboard/original_admin_dashboard`,
  `/dashboard/security_admin_dashboard`,
  `/dashboard/timetabling_admin_dashboard`,
  `/dashboard/dean_admin_dashboard`,
  `/dashboard/enrollment_dashboard` — real, working dashboards backed
  by the live backend (guard admit/reject queue + access log;
  student/guest/access-log overview; a unit registry (unit_code/
  unit_name/department/course/year/semester, with a lecturer
  self-registered from the SmartAttendance app or assigned/reassigned
  here) that timetable entries reference instead of a facilitator
  name typed per row; create/postpone/cancel/delete timetable
  entries filtered by department/course/year/semester (semester 1
  and semester 2 commonly differ for the same course & year); a Dean's
  department-scoped student roster, classification counts, unit/
  timetable totals, department timetable, and venue cameras; camera
  management; lecturer profile registration; access analytics +
  false-positive flagging; a Temporary Admin's enrollment-only form
  — per `docs/PRD.md` §8, §13). The Original Admin has full camera
  control (provision/configure/remove) — adding a camera requires
  picking which product it serves (Smart Access/checkpoint or Smart
  Attendance/classroom), its specific location, and its IP
  address/stream URL — manages lecturer profiles
  (`src/components/LecturerManagementClient.tsx` — register a
  lecturer's name/department here first, then use their Lecturer ID
  as the enrollment form's "linked person ID" so SmartAttendance can
  resolve them to their own units), and sees an Analytics section
  (`src/components/AnalyticsClient.tsx` — counts by decision,
  movement by entrance/person type, false-positive rate, average
  recognition/liveness scores, over a selectable date range); the
  Security Admin can configure/change camera status but not
  provision or remove one; the Dean gets a read-only,
  department-filtered camera view
  (`src/components/CameraManagementClient.tsx`). The Security Admin
  (or Original Admin) also has a dedicated SmartAccess dashboard at
  `/dashboard/security_admin_dashboard/investigations`
  (`SmartAccessClient.tsx`, docs/PRD.md §6.3a): a **watchlist**
  (register a person of interest; once it has a reference photo on
  the backend, every live sighting at a checkpoint is logged
  automatically — a target flag overrides normal admission, even for
  an otherwise-legitimate member) and **investigations** (lightweight
  case files, optionally linked to one target, with an append-only
  note timeline). Both the Guard and
  Admin dashboards' access log
  (`src/components/AccessLogTable.tsx`) let a Guard or Admin flag a
  VERIFIED entry as a false positive after determining, outside this
  system, that it matched the wrong person — there's no ground truth
  in the data to infer that automatically. The Dean dashboard's
  "class logs" stays out of scope until the SmartAttendance
  classroom-camera pipeline exists. Every dashboard slug
  `auth_service.resolve_dashboard()` can hand back now has a real
  page — `/dashboard/[slug]` is just a fallback for any future/
  unmapped slug.
- `src/proxy.ts` protects every `/dashboard/*` route and `/enroll`:
  no session -> redirected to `/login`; logged in but the URL
  doesn't match your own `dashboard` slug (or, for `/enroll`, your
  role isn't ADMIN) -> bounced back to your own dashboard. A "Sign
  out" button on each dashboard clears the session.
- The backend itself (`Alternative_Identifier`) now requires
  authentication on every endpoint except `POST /login` — this app's
  session cookie carries the `access_token` that `/login` returns,
  and forwards it as a Bearer header on every proxied call
  (`src/lib/api.ts`, `src/lib/routeAuth.ts`). The Route Handlers
  under `src/app/api/*` also check the session themselves (not just
  `src/proxy.ts`), since they're a separate attack surface someone
  could hit directly.

## Backend

All of the above talks to the FastAPI backend in the
`Alternative_Identifier` repo (recognition engine + SmartAccess +
the `/login`/`/enroll` endpoints). Point this app at it via
`API_BASE_URL` — copy `.env.example` to `.env.local` and set it to
wherever that backend is running (e.g. `http://localhost:8000` for
local dev).

Also set `SESSION_SECRET` in `.env.local` (generate one with
`openssl rand -base64 32`) — required in production, falls back to
an insecure dev-only value locally if unset.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## End-to-end tests

```bash
npm run test:e2e
```

Runs the Playwright suite under `e2e/` against `e2e/mock-backend.mjs`
(a minimal in-memory stand-in for `Alternative_Identifier`'s FastAPI
backend — not the real recognition engine, just enough of its API
shape to exercise this app's own routing/session/UI logic) — no live
backend or database needed. `playwright.config.ts` starts both the
mock backend and `next dev` for you.

Covers: login + dashboard routing for every role (including wrong
password, an already-logged-in visitor bounced from `/login`, a
logged-in user redirected away from another role's dashboard, and
sign-out actually clearing the session — all in `e2e/login.spec.ts`),
a full Timetabling CRUD lifecycle (`e2e/timetabling.spec.ts`), and
the Temporary Admin enrollment flow (`e2e/enrollment.spec.ts`). Not
every dashboard has a persisted spec yet (Dean, camera management,
lecturer profiles, and analytics were verified manually against ad
hoc mock backends during development, per their own commits, but
don't have permanent e2e coverage) — a reasonable next addition if
this suite grows further.

## Deploy

Deployed on [Vercel](https://vercel.com). Set `API_BASE_URL` and
`SESSION_SECRET` in the project's environment variables.
