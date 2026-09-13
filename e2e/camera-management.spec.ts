import { test, expect } from "@playwright/test";

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
});

test("Original Admin has full camera control: create, change status, disable/enable, delete", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/original_admin_dashboard", { timeout: 10000 });

  await expect(page.getByText("Add a camera")).toBeVisible();

  await page.fill('input[name="camera_id"]', "CAM-GATE-1");
  await page.fill('input[name="name"]', "Main Gate");
  await page.selectOption('select[name="camera_type"]', "CHECKPOINT");
  await page.fill('input[name="location"]', "Main Gate");
  await page.locator("button", { hasText: "Add camera" }).click();
  await page.waitForSelector("text=CAM-GATE-1", { timeout: 10000 });

  let row = page.locator("tr", { hasText: "CAM-GATE-1" });
  await expect(row.locator("td", { hasText: /^OFFLINE/ })).toBeVisible();

  await row.locator("button", { hasText: "Mark online" }).click();
  await page.waitForTimeout(500);
  row = page.locator("tr", { hasText: "CAM-GATE-1" });
  await expect(row.locator("td", { hasText: /^ONLINE/ })).toBeVisible();

  // NOTE: asserting via row.getByText("disabled") is a trap here —
  // Playwright's text matching can concatenate sibling elements'
  // text, and "Disable" immediately followed by "Delete" forms
  // "...DisableDelete..." which case-insensitively CONTAINS
  // "disabled" as a substring even when the badge isn't rendered.
  // Scoping to the badge's own <span> avoids that false match.
  await row.locator("button", { hasText: "Disable" }).click();
  await page.waitForTimeout(500);
  row = page.locator("tr", { hasText: "CAM-GATE-1" });
  await expect(row.locator("span", { hasText: "disabled" })).toBeVisible();

  await row.locator("button", { hasText: "Enable" }).click();
  await page.waitForTimeout(500);
  row = page.locator("tr", { hasText: "CAM-GATE-1" });
  await expect(row.locator("span", { hasText: "disabled" })).toHaveCount(0);

  await row.locator("button", { hasText: "Delete" }).click();
  await expect(page.getByText("No cameras registered yet.")).toBeVisible();
});

test("Security Admin can configure/change status but not create or delete a camera", async ({ page }) => {
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cameras: [
        {
          camera_id: "CAM-GATE-1",
          name: "Main Gate",
          camera_type: "CHECKPOINT",
          location: "Main Gate",
          department: null,
          source: null,
          status: "OFFLINE",
          enabled: true,
          created_by: "original1",
          created_at: "2026-09-13T00:00:00",
        },
      ],
    }),
  });

  await page.goto("/login");
  await page.fill('input[name="username"]', "security1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/security_admin_dashboard", { timeout: 10000 });

  await expect(page.getByText("Add a camera")).toHaveCount(0);

  const row = page.locator("tr", { hasText: "CAM-GATE-1" });
  await expect(row).toBeVisible();
  await expect(row.locator("button", { hasText: "Delete" })).toHaveCount(0);

  await row.locator("button", { hasText: "Mark online" }).click();
  await page.waitForTimeout(500);
  await expect(page.locator("tr", { hasText: "CAM-GATE-1" }).locator("td", { hasText: /^ONLINE/ })).toBeVisible();
});
