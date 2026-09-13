import { SignJWT, jwtVerify } from "jose";

// Server-only. Never import this from a Client Component — only
// from Server Actions, Server Components, Route Handlers, or
// src/proxy.ts.
//
// There is no session store on the backend (src/api/main.py's
// /login just checks credentials and returns a role), so the
// session itself is created and verified entirely here, at the
// Next.js layer, following the "Stateless Sessions" pattern —
// an encrypted JWT in an httpOnly cookie, per Next.js's own
// authentication guide (node_modules/next/dist/docs/01-app/02-guides/
// authentication.md, since this Next.js version's conventions can
// differ from training data — see AGENTS.md).

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

export type SessionPayload = {
  username: string;
  role: string;
  adminTier: string | null;
  dashboard: string;
};

// Resolved lazily (inside the functions below), not at module load —
// `next build` evaluates route modules with NODE_ENV=production
// before any real runtime env vars are necessarily available, so
// throwing here at import time would fail the build itself rather
// than an actual unconfigured deployment.
function getEncodedKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production (see .env.example)."
    );
  }

  return new TextEncoder().encode(
    secret ?? "dev-only-insecure-secret-change-me"
  );
}

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_DURATION_MS) / 1000))
    .sign(getEncodedKey());
}

export async function decryptSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ["HS256"],
    });

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_MS };
