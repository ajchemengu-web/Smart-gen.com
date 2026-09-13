// Client-only. If any proxied backend call comes back 401 while the
// session cookie itself is still valid (see src/app/api/session/
// route.ts's docstring for why that can happen), every dashboard
// polling loop was previously stuck retrying forever with a generic
// "Backend returned an error" message — there's no way to recover
// from an unusable access_token without a fresh login. This clears
// the now-dead session cookie first (so /login doesn't immediately
// bounce back to the dashboard via src/proxy.ts) and then sends the
// user there.
export async function handleUnauthorized() {
  await fetch("/api/session", { method: "DELETE" }).catch(() => {});
  // A full navigation (not useRouter().push, which the callers of
  // this shared, non-hook utility can't easily supply anyway) is
  // deliberate: it forces src/proxy.ts to re-run against the
  // now-cleared cookie, rather than trusting a client-side route
  // cache that was built while the (bad) session still looked valid.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}

export function anyUnauthorized(responses: Response[]) {
  return responses.some((response) => response.status === 401);
}
