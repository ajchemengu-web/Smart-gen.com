import { test, expect } from "@playwright/test";

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
});

test("Original Admin registers a lecturer profile", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/original_admin_dashboard", { timeout: 10000 });

  await page.waitForSelector("text=Lecturer profiles", { timeout: 10000 });
  await expect(page.getByText("No lecturer profiles yet.")).toBeVisible();

  const lecturerForm = page.locator("form").filter({
    has: page.locator('input[name="lecturer_id"]'),
  });
  await lecturerForm.locator('input[name="lecturer_id"]').fill("L1");
  await lecturerForm.locator('input[name="full_name"]').fill("Dr. Otieno");
  await lecturerForm.locator('input[name="department"]').fill("School of Computing");
  await lecturerForm.locator("button", { hasText: "Add lecturer" }).click();

  await page.waitForSelector("text=Dr. Otieno", { timeout: 10000 });
  const row = page.locator("tr", { hasText: "L1" });
  await expect(row.locator("td", { hasText: "School of Computing" })).toBeVisible();
});
