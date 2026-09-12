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
  (`docs/PRD.md` §9).
- `/enroll` — create a login for a Student, Lecturer, Guard, Staff
  member, or Admin (`docs/PRD.md` §5). **Not access-restricted yet**
  — see the note in the recognition-engine repo's
  `src/services/auth_service.py`.
- `/dashboard/[slug]` — placeholder per-role dashboards (Original
  Admin, Security Admin, Timetabling, Dean, Guard, Enrollment/
  Temporary Admin). Real content per `docs/PRD.md` §8 is not built
  yet; this just confirms the login → dashboard routing works.

## Backend

All of the above talks to the FastAPI backend in the
`Alternative_Identifier` repo (recognition engine + SmartAccess +
the `/login`/`/enroll` endpoints). Point this app at it via
`API_BASE_URL` — copy `.env.example` to `.env.local` and set it to
wherever that backend is running (e.g. `http://localhost:8000` for
local dev).

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deployed on [Vercel](https://vercel.com). Set `API_BASE_URL` in the
project's environment variables to the deployed backend's URL.
