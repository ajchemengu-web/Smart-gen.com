import { test } from "@playwright/test";

// Simulates the backend rejecting an otherwise-still-valid session
// cookie's access_token (e.g. Alternative_Identifier's JWT_SECRET
// rotated) by having the mock backend return 401 for every request
// using a specific token, then confirms the dashboard redirects to
// /login instead of getting stuck retrying forever.

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
});

test("a 401 from the backend on an otherwise-valid session redirects to /login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/original_admin_dashboard", { timeout: 10000 });

  // Revoke the token server-side without touching the browser's
  // session cookie — this is exactly the "cookie still valid,
  // backend rejects the token" scenario.
  await fetch("http://localhost:8000/__revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "original1-token" }),
  });

  // The dashboard's own polling loop should notice the 401 on its
  // next cycle and redirect, without the user clicking anything.
  await page.waitForURL("**/login", { timeout: 15000 });
});
