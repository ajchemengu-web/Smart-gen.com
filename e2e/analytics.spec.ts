import { test, expect } from "@playwright/test";

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessLogs: [
        {
          id: 1, person_type: "STUDENT", person_identifier: "S1",
          entrance: "Main Gate", recognition_score: 0.91, liveness_score: 0.8,
          decision: "VERIFIED", guard_id: null,
          false_positive: false, false_positive_reason: null,
          timestamp: "2026-09-13T08:00:00",
        },
        {
          id: 2, person_type: "GUEST", person_identifier: "AG-1",
          entrance: "Main Gate", recognition_score: null, liveness_score: null,
          decision: "AG_VALID", guard_id: null,
          false_positive: false, false_positive_reason: null,
          timestamp: "2026-09-13T08:05:00",
        },
      ],
    }),
  });
});

test("Analytics section renders breakdowns and a VERIFIED row can be flagged as a false positive", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/original_admin_dashboard", { timeout: 10000 });

  // Wait for AdminOverviewClient's own fetch to resolve, not just
  // the static label text — that renders immediately, before the
  // fetch resolves. This is the Overview section (root of the
  // dashboard); the entrance/movement breakdown lives on the
  // separate Analytics sub-route now.
  const verifiedRow = page.locator("tr", { hasText: "S1" });
  await expect(verifiedRow).toBeVisible({ timeout: 10000 });
  await expect(verifiedRow.locator("td", { hasText: "VERIFIED" })).toBeVisible();
  await verifiedRow.locator("button", { hasText: "Flag false positive" }).click();
  await verifiedRow.locator('input[placeholder="Reason"]').fill("Guard confirmed wrong match on review");
  await verifiedRow.locator("button", { hasText: "Confirm" }).click();
  await page.waitForSelector("text=Flagged false positive", { timeout: 10000 });

  const guestRow = page.locator("tr", { hasText: "AG-1" });
  await expect(guestRow.locator("button", { hasText: "Flag false positive" })).toHaveCount(0);

  await page.goto("/dashboard/original_admin_dashboard/analytics");
  await expect(page.locator("table", { hasText: "Main Gate" }).first()).toBeVisible({
    timeout: 10000,
  });
});
