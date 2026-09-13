import { test, expect } from "@playwright/test";

const STUDENTS = [
  { student_id: "S1", full_name: "Alice Wanjiru", admission_number: "AD001", department: "School of Computing", course: "BSc Computer Science", year: 2 },
  { student_id: "S2", full_name: "Brian Otieno", admission_number: "AD002", department: "School of Computing", course: "BSc Computer Science", year: 2 },
  { student_id: "S3", full_name: "Carol Njeri", admission_number: "AD003", department: "School of Computing", course: "BSc Computer Science", year: 1 },
  { student_id: "S4", full_name: "Dennis Kamau", admission_number: "AD004", department: "School of Business", course: "BCom", year: 1 },
];

const TIMETABLE = [
  { id: 1, course: "BSc Computer Science", year: 2, department: "School of Computing", day_of_week: "MONDAY", start_time: "09:00", end_time: "11:00", unit_name: "Data Structures", facilitator: "Dr. Otieno", venue: "Hall A", status: "ON", created_by: "tt1", created_at: "2026-09-13T00:00:00" },
  { id: 2, course: "BCom", year: 1, department: "School of Business", day_of_week: "WEDNESDAY", start_time: "10:00", end_time: "12:00", unit_name: "Accounting", facilitator: "Dr. Mwangi", venue: "Hall D", status: "ON", created_by: "tt1", created_at: "2026-09-13T00:00:00" },
];

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ students: STUDENTS, timetable: TIMETABLE, nextTimetableId: 3 }),
  });
});

test("Dean dashboard: unfiltered overview, then department filter narrows roster/timetable, then clears", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "dean1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/dean_admin_dashboard", { timeout: 10000 });

  // Wait for the actual roster/timetable data (fetched client-side)
  // rather than the static "Total students" label, which renders
  // immediately and doesn't imply the fetch resolved.
  await expect(page.getByText("Alice Wanjiru")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Dennis Kamau")).toBeVisible();

  await page.fill('input[placeholder="e.g. School of Computing"]', "School of Computing");
  await page.locator("button", { hasText: "View department" }).click();

  await expect(page.getByText("Dennis Kamau")).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByText("Alice Wanjiru")).toBeVisible();
  await expect(page.getByText("Data Structures")).toBeVisible();
  await expect(page.getByText("Accounting")).toHaveCount(0);

  await page.locator("button", { hasText: "View all departments" }).click();

  await expect(page.getByText("Dennis Kamau")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Accounting")).toBeVisible();
});
