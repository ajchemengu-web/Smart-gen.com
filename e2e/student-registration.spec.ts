import { test, expect } from "@playwright/test";

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
});

test("registering a student creates a record pending face enrollment", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/original_admin_dashboard", {
    timeout: 10000,
  });

  await page.goto(
    "/dashboard/original_admin_dashboard/facial-enrollment"
  );

  // Two forms share these field names now (StudentFaceEnrollmentClient
  // also has student_id/full_name/etc.) — scope to this one, which is
  // the only form without a photos input.
  const registerForm = page.locator("form").filter({
    hasNot: page.locator('input[name="photos"]'),
  });
  await registerForm.locator('input[name="student_id"]').fill("STU-300");
  await registerForm.locator('input[name="full_name"]').fill("Peter Kamau");
  await registerForm
    .locator('input[name="admission_number"]')
    .fill("ADM-2026-300");
  await registerForm.locator('input[name="hostel"]').fill("Hostel B");
  await registerForm.locator('input[name="room"]').fill("B7");
  await registerForm
    .locator("button", { hasText: "Register student" })
    .click();

  await page.waitForSelector("text=Registered Peter Kamau", {
    timeout: 10000,
  });

  await page.goto("/dashboard/original_admin_dashboard");
  const row = page.locator("tr", { hasText: "Peter Kamau" });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator("td", { hasText: "Pending" })).toBeVisible();
});
