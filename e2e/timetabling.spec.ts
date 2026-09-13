import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });

  await page.goto("/login");
  await page.fill('input[name="username"]', "tt1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/timetabling_admin_dashboard", { timeout: 10000 });
});

test("full lifecycle: create a unit, create an entry against it, filter, postpone, reactivate, cancel, delete", async ({ page }) => {
  await expect(page.getByText("No units yet.")).toBeVisible();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();

  // A unit is created once (department/course/year/semester); a
  // timetable entry then just references it and inherits that
  // classification instead of it being retyped per row (docs/PRD.md
  // §6, §8) — the mock backend assigns this first unit id "1".
  await page.fill('input[name="unit_code"]', "SCO 104");
  await page.fill('input[name="unit_name"]', "Data Structures");
  await page.fill('input[name="department"]', "School of Computing");
  await page.fill('input[name="course"]', "BSc CS");
  await page.fill('input[name="year"]', "2");
  await page.fill('input[name="semester"]', "1");
  await page.locator("button", { hasText: "Add unit" }).click();
  await page.waitForSelector("text=SCO 104", { timeout: 10000 });

  const unitsTable = page.locator("table").first();
  const unitRow = unitsTable.locator("tr", { hasText: "SCO 104" });
  await expect(unitRow).toBeVisible();
  await expect(unitRow.locator("select")).toHaveValue("");

  // Create a timetable entry against that unit — no department/
  // course/year/semester/unit name/facilitator fields on this form
  // at all, they all come from the unit itself.
  await page.selectOption('select[name="unit_id"]', "1");
  await page.selectOption('select[name="day_of_week"]', "TUESDAY");
  await page.fill('input[name="start_time"]', "09:00");
  await page.fill('input[name="end_time"]', "11:00");
  await page.fill('input[name="venue"]', "LT 3");
  await page.locator("button", { hasText: "Add entry" }).click();
  await page.waitForSelector("text=No timetable entries yet.", {
    state: "hidden",
    timeout: 10000,
  });

  const timetableTable = () => page.locator("table").last();
  const entryRow = () => timetableTable().locator("tr", { hasText: "Data Structures" });

  await expect(entryRow()).toBeVisible();
  await expect(entryRow().locator("td", { hasText: "School of Computing" })).toBeVisible();
  await expect(entryRow().locator("td", { hasText: /^ON$/ })).toBeVisible();
  // The unit has no lecturer yet, so the entry's facilitator is
  // derived as unassigned rather than a typed-in name.
  await expect(entryRow().locator("td", { hasText: "Unassigned" })).toBeVisible();
  await expect(entryRow().getByText("SCO 104")).toBeVisible();

  // Filter by matching department keeps it visible; non-matching hides it.
  await page.fill('input[placeholder="Filter by department"]', "School of Computing");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(entryRow()).toBeVisible();

  await page.fill('input[placeholder="Filter by department"]', "School of Business");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();

  await page.fill('input[placeholder="Filter by department"]', "");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await page.waitForSelector("text=No timetable entries yet.", {
    state: "hidden",
    timeout: 10000,
  });

  // Filter by matching course keeps it visible; non-matching hides it.
  await page.fill('input[placeholder="Filter by course"]', "BSc CS");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(entryRow()).toBeVisible();

  await page.fill('input[placeholder="Filter by course"]', "Nonexistent");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();

  await page.fill('input[placeholder="Filter by course"]', "");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await page.waitForSelector("text=No timetable entries yet.", {
    state: "hidden",
    timeout: 10000,
  });

  // Filter by matching semester keeps it visible; non-matching hides it.
  await page.fill('input[placeholder="Filter by semester"]', "1");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(entryRow()).toBeVisible();

  await page.fill('input[placeholder="Filter by semester"]', "2");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();

  await page.fill('input[placeholder="Filter by semester"]', "");
  await page.locator("button", { hasText: "Apply filters" }).click();
  await page.waitForSelector("text=No timetable entries yet.", {
    state: "hidden",
    timeout: 10000,
  });

  // Postpone -> reactivate -> cancel -> delete.
  await entryRow().locator("button", { hasText: "Postpone" }).click();
  await page.waitForTimeout(500);
  await expect(entryRow().locator("td", { hasText: "POSTPONED" })).toBeVisible();

  await entryRow().locator("button", { hasText: "Reactivate" }).click();
  await page.waitForTimeout(500);
  await expect(entryRow().locator("td", { hasText: /^ON$/ })).toBeVisible();

  await entryRow().locator("button", { hasText: "Cancel" }).click();
  await page.waitForTimeout(500);
  await expect(entryRow().locator("td", { hasText: "CANCELLED" })).toBeVisible();

  await entryRow().locator("button", { hasText: "Delete" }).click();
  await expect(page.getByText("No timetable entries yet.")).toBeVisible();
});

test("reassigning a unit's lecturer updates its future timetable entries' facilitator", async ({ page }) => {
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lecturers: [{ lecturer_id: "L1", full_name: "Dr. Otieno", department: null }],
      units: [
        {
          id: 1,
          unit_code: "SCO 104",
          unit_name: "Data Structures",
          department: "School of Computing",
          course: "BSc CS",
          year: 2,
          semester: 1,
          lecturer_id: null,
          created_by: "tt1",
          created_at: "2026-09-13T00:00:00",
        },
      ],
      nextUnitId: 2,
    }),
  });
  await page.reload();

  const unitsTable = page.locator("table").first();
  const unitRow = unitsTable.locator("tr", { hasText: "SCO 104" });
  await expect(unitRow.locator("select")).toHaveValue("");

  await unitRow.locator("select").selectOption("L1");
  await expect(unitRow.locator("select")).toHaveValue("L1");
  await expect(unitRow.locator("select option:checked")).toHaveText("Dr. Otieno");

  // A newly created entry against this now-claimed unit picks up
  // the lecturer as its facilitator automatically.
  await page.selectOption('select[name="unit_id"]', "1");
  await page.selectOption('select[name="day_of_week"]', "MONDAY");
  await page.fill('input[name="start_time"]', "09:00");
  await page.fill('input[name="end_time"]', "11:00");
  await page.fill('input[name="venue"]', "Hall A");
  await page.locator("button", { hasText: "Add entry" }).click();

  const entryRow = page.locator("table").last().locator("tr", { hasText: "Data Structures" });
  await expect(entryRow.locator("td", { hasText: "Dr. Otieno" })).toBeVisible();
});
