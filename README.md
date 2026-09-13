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
  `/dashboard/security_admin_dashboard` — real, working dashboards
  backed by the live backend (guard admit/reject queue + access log;
  student/guest/access-log overview). Every other dashboard slug
  (Timetabling, Dean, Enrollment/Temporary Admin) is still a
  placeholder via `/dashboard/[slug]` — real content per
  `docs/PRD.md` §8 needs backend features that don't exist yet.
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

## Deploy

Deployed on [Vercel](https://vercel.com). Set `API_BASE_URL` and
`SESSION_SECRET` in the project's environment variables.
