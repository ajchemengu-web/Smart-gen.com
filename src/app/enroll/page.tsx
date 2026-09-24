import { cookies } from "next/headers";
import Link from "next/link";
import EnrollForm from "./EnrollForm";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getCameras } from "@/lib/api";
import styles from "../form.module.css";

export const metadata = {
  title: "Enroll a user — Smart Gen",
};

export default async function EnrollPage() {
  const cookieStore = await cookies();
  const session = await decryptSession(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  // src/proxy.ts already guarantees an ADMIN session reaches this
  // page at all; session is only possibly null here in the instant
  // between that check and this render, which redirect() below
  // covers defensively rather than crashing on session.dashboard.
  const backHref = session ? `/dashboard/${session.dashboard}` : "/login";

  // A Guard's location must match an actual registered checkpoint
  // camera, not a free-typed string — sourced from the same registry
  // the Original/Security Admin's Camera Management screen writes to.
  let checkpointLocations: string[] = [];

  if (session) {
    const cameras = await getCameras(session.accessToken, {
      camera_type: "CHECKPOINT",
    }).catch(() => []);

    checkpointLocations = [
      ...new Set(
        cameras
          .map((camera) => camera.location)
          .filter((location): location is string => Boolean(location))
      ),
    ];
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>Enrollment</h1>
        <p className={styles.subtitle}>
          Create a login for a Student, Lecturer, Guard, Staff member, or
          Admin. Facial enrollment for recognition-based roles happens
          separately in the recognition engine — this only creates the
          login/dashboard-routing record.
        </p>
        <EnrollForm checkpointLocations={checkpointLocations} />
        <p className={styles.footnote}>
          <Link href={backHref}>Back to dashboard</Link>
        </p>
      </div>
    </main>
  );
}
