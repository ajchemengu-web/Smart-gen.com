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

  // Two forms share these field names now (StudentRegistrationClient
  // also has student_id/full_name/etc.) — scope to this one via its
  // unique photos input.
  const enrollForm = page.locator("form").filter({
    has: page.locator('input[name="photos"]'),
  });
  await enrollForm.locator('input[name="student_id"]').fill("STU-001");
  await enrollForm.locator('input[name="full_name"]').fill("Amina Wanjiru");
  await enrollForm
    .locator('input[name="admission_number"]')
    .fill("ADM-2026-001");
  await enrollForm.locator('input[name="hostel"]').fill("Hostel A");
  await enrollForm.locator('input[name="room"]').fill("A12");
  await enrollForm.locator('input[name="photos"]').setInputFiles({
    name: "photo.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-jpeg-bytes"),
  });

  // The admin can read the real notice text to the student.
  await enrollForm.locator("summary").click();
  await expect(
    enrollForm.getByText("You do not have to agree", { exact: false })
  ).toBeVisible({ timeout: 10000 });

  // Without confirming consent, the browser blocks the submit — no
  // request is sent and nothing is enrolled.
  await enrollForm.locator("button", { hasText: "Enroll face" }).click();
  await expect(
    enrollForm.locator('input[name="consent_confirmed"]')
  ).toHaveJSProperty("validity.valueMissing", true);
  await expect(page.getByText("Enrolled Amina Wanjiru")).toHaveCount(0);

  await enrollForm.locator('input[name="consent_confirmed"]').check();
  await enrollForm.locator("button", { hasText: "Enroll face" }).click();

  await page.waitForSelector("text=Enrolled Amina Wanjiru", {
    timeout: 10000,
  });

  await page.goto("/dashboard/original_admin_dashboard");
  const row = page.locator("tr", { hasText: "Amina Wanjiru" });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.locator("td", { hasText: "STU-001" })).toBeVisible();
});

test("a face enrolled before consent was recorded is flagged on the Students list", async ({
  page,
}) => {
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      students: [
        {
          student_id: "STU-LEGACY",
          full_name: "Legacy Student",
          admission_number: "ADM-LEGACY",
          hostel: "Hostel B",
          room: "B1",
          department: null,
          course: null,
          year: null,
          semester: null,
          embedding_file: "STU-LEGACY.npy",
          consent_recorded: false,
        },
      ],
    }),
  });

  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/original_admin_dashboard", {
    timeout: 10000,
  });

  const row = page.locator("tr", { hasText: "Legacy Student" });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(
    row.locator("td", { hasText: "consent not recorded" })
  ).toBeVisible();
});
