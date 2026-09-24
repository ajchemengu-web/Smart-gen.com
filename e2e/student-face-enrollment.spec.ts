import { test, expect } from "@playwright/test";

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
});

test("enrolling a student's face makes them appear on the Students list", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/original_admin_dashboard", {
    timeout: 10000,
  });

  // The student shouldn't exist yet from just this navigation.
  await expect(page.getByText("No students enrolled yet.")).toBeVisible({
    timeout: 10000,
  });

  await page.goto(
    "/dashboard/original_admin_dashboard/facial-enrollment"
  );

  await page.fill('input[name="student_id"]', "STU-001");
  await page.fill('input[name="full_name"]', "Amina Wanjiru");
  await page.fill('input[name="admission_number"]', "ADM-2026-001");
  await page.fill('input[name="hostel"]', "Hostel A");
  await page.fill('input[name="room"]', "A12");
  await page.setInputFiles('input[name="photos"]', {
    name: "photo.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-jpeg-bytes"),
  });
  await page.locator("button", { hasText: "Enroll face" }).click();

  await page.waitForSelector("text=Enrolled Amina Wanjiru", {
    timeout: 10000,
  });

  await page.goto("/dashboard/original_admin_dashboard");
  const row = page.locator("tr", { hasText: "Amina Wanjiru" });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator("td", { hasText: "STU-001" })).toBeVisible();
});
