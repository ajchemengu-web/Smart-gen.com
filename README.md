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
  member, or Admin (`docs/PRD.md` §5). **Not access-restricted yet**
  — see the note in the recognition-engine repo's
  `src/services/auth_service.py`.
- `/dashboard/guard_dashboard`, `/dashboard/original_admin_dashboard`,
  `/dashboard/security_admin_dashboard` — real, working dashboards
  backed by the live backend (guard admit/reject queue + access log;
  student/guest/access-log overview). Every other dashboard slug
  (Timetabling, Dean, Enrollment/Temporary Admin) is still a
  placeholder via `/dashboard/[slug]` — real content per
  `docs/PRD.md` §8 needs backend features that don't exist yet.
- `src/proxy.ts` protects every `/dashboard/*` route: no session ->
  redirected to `/login`; logged in but the URL doesn't match your
  own `dashboard` slug -> bounced back to it. A "Sign out" button on
  each dashboard clears the session.

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
