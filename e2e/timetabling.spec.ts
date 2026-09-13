import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });

  await page.goto("/login");
  await page.fill('input[name="username"]', "tt1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/timetabling_admin_dashboard", { timeout: 10000 });
});

test("full timetable entry lifecycle: create, filter, postpone, reactivate, cancel, delete", async ({ page }) => {
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();

  // Department -> Course -> Year is the required order (docs/PRD.md
  // §6, §8): that triple is what routes this entry to the right
  // students' own schedules in SmartAttendance.
  await page.fill('input[name="department"]', "School of Computing");
  await page.fill('input[name="course"]', "BSc CS");
  await page.fill('input[name="year"]', "2");
  await page.selectOption('select[name="day_of_week"]', "TUESDAY");
  await page.fill('input[name="start_time"]', "09:00");
  await page.fill('input[name="end_time"]', "11:00");
  await page.fill('input[name="unit_name"]', "Data Structures");
  await page.fill('input[name="facilitator"]', "Dr. Otieno");
  await page.fill('input[name="venue"]', "LT 3");
  await page.locator("button", { hasText: "Add entry" }).click();
  await page.waitForSelector("text=Data Structures", { timeout: 10000 });

  const row = page.locator("tr", { hasText: "Data Structures" });
  await expect(row.locator("td", { hasText: "School of Computing" })).toBeVisible();
  await expect(row.locator("td", { hasText: /^ON$/ })).toBeVisible();

  // Filter by matching department keeps it visible; non-matching hides it.
  await page.fill('input[placeholder="Filter by department"]', "School of Computing");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(page.getByText("Data Structures")).toBeVisible();

  await page.fill('input[placeholder="Filter by department"]', "School of Business");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();

  await page.fill('input[placeholder="Filter by department"]', "");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await page.waitForSelector("text=Data Structures", { timeout: 10000 });

  // Filter by matching course keeps it visible; non-matching hides it.
  await page.fill('input[placeholder="Filter by course"]', "BSc CS");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(page.getByText("Data Structures")).toBeVisible();

  await page.fill('input[placeholder="Filter by course"]', "Nonexistent");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();

  await page.fill('input[placeholder="Filter by course"]', "");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await page.waitForSelector("text=Data Structures", { timeout: 10000 });

  // Postpone -> reactivate -> cancel -> delete.
  await page.locator("tr", { hasText: "Data Structures" }).locator("button", { hasText: "Postpone" }).click();
  await page.waitForTimeout(500);
  await expect(page.locator("tr", { hasText: "Data Structures" }).locator("td", { hasText: "POSTPONED" })).toBeVisible();

  await page.locator("tr", { hasText: "Data Structures" }).locator("button", { hasText: "Reactivate" }).click();
  await page.waitForTimeout(500);
  await expect(page.locator("tr", { hasText: "Data Structures" }).locator("td", { hasText: /^ON$/ })).toBeVisible();

  await page.locator("tr", { hasText: "Data Structures" }).locator("button", { hasText: "Cancel" }).click();
  await page.waitForTimeout(500);
  await expect(page.locator("tr", { hasText: "Data Structures" }).locator("td", { hasText: "CANCELLED" })).toBeVisible();

  await page.locator("tr", { hasText: "Data Structures" }).locator("button", { hasText: "Delete" }).click();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();
});
