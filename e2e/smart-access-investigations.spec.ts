import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });

  await page.goto("/login");
  await page.fill('input[name="username"]', "security1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/security_admin_dashboard", { timeout: 10000 });

  await page
    .locator("a", { hasText: "Target tracking & investigations" })
    .click();
  await page.waitForURL(
    "**/dashboard/security_admin_dashboard/investigations",
    { timeout: 10000 }
  );
});

test("register a target, track its status, then open and work a linked case", async ({ page }) => {
  await expect(page.getByText("No targets registered yet.")).toBeVisible();
  await expect(page.getByText("No cases yet.")).toBeVisible();

  // Badges render as a bare <span>ACTIVE|RESOLVED|OPEN|CLOSED</span>
  // with no other markup — scoping to the tag with an exact-text
  // regex avoids any ambiguity with the status filter <option>s,
  // which carry the same words in different casing/markup.
  const targetBadge = () => page.locator("span", { hasText: /^(ACTIVE|RESOLVED)$/ });
  const caseBadge = () => page.locator("span", { hasText: /^(OPEN|CLOSED)$/ });

  // ------------------------------------------------------------
  // WATCHLIST: register a target
  // ------------------------------------------------------------

  await page.fill('input[name="full_name"]', "Person Of Interest");
  await page.fill('input[name="description"]', "Tall, red jacket");
  await page.fill('input[name="reason"]', "Reported theft");
  await page.locator("button", { hasText: "Register target" }).click();
  await page.waitForSelector("text=Person Of Interest", { timeout: 10000 });

  // Scoped to <p> (the card's meta line) — an <option> in the case
  // form's target picker also contains "TGT-0001" and would
  // otherwise make this locator ambiguous.
  await expect(page.locator("p", { hasText: "TGT-0001" })).toBeVisible();
  await expect(targetBadge()).toHaveText("ACTIVE");

  // Resolve -> badge flips, action label flips.
  await page.locator("button", { hasText: "Mark resolved" }).click();
  await page.waitForTimeout(500);
  await expect(targetBadge()).toHaveText("RESOLVED");
  await expect(page.locator("button", { hasText: "Reactivate" })).toBeVisible();

  // Reactivate -> back to ACTIVE.
  await page.locator("button", { hasText: "Reactivate" }).click();
  await page.waitForTimeout(500);
  await expect(targetBadge()).toHaveText("ACTIVE");

  // Sightings — none logged yet in this scenario.
  await page.locator("button", { hasText: "View sightings" }).click();
  await expect(page.getByText("No sightings logged yet.")).toBeVisible();
  await page.locator("button", { hasText: "Hide sightings" }).click();

  // ------------------------------------------------------------
  // INVESTIGATIONS: open a case linked to that target
  // ------------------------------------------------------------

  await page.fill('input[name="title"]', "Repeated after-hours sighting");
  await page.fill('input[name="description"]', "Flagged three nights running.");
  await page.selectOption('select[name="target_id"]', "TGT-0001");
  await page.locator("button", { hasText: "Open case" }).click();
  await page.waitForSelector("text=Repeated after-hours sighting", { timeout: 10000 });

  await expect(page.getByText("linked to TGT-0001", { exact: false })).toBeVisible();
  await expect(caseBadge()).toHaveText("OPEN");

  // Notes — add one and see it appear.
  await page.locator("button", { hasText: "View notes" }).click();
  await expect(page.getByText("No notes yet.")).toBeVisible();

  await page.fill('input[placeholder="Add a note…"]', "Reviewed camera footage.");
  await page.locator("button", { hasText: "Add note" }).click();
  await page.waitForSelector("text=Reviewed camera footage.", { timeout: 10000 });

  // Close -> reopen.
  await page.locator("button", { hasText: "Close case" }).click();
  await page.waitForTimeout(500);
  await expect(caseBadge()).toHaveText("CLOSED");

  await page.locator("button", { hasText: "Reopen case" }).click();
  await page.waitForTimeout(500);
  await expect(caseBadge()).toHaveText("OPEN");
});

test("registering a target by admission number derives their name and links the student record", async ({ page }) => {
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      students: [
        {
          student_id: "S1",
          full_name: "Alice Wanjiru",
          admission_number: "AD001",
          department: "School of Computing",
          course: "BSc Computer Science",
          year: 2,
        },
      ],
    }),
  });
  await page.reload();
  await page.waitForSelector("text=No targets registered yet.", { timeout: 10000 });

  // No full_name typed at all — only the admission number.
  await page.fill('input[name="admission_number"]', "AD001");
  await page.fill('input[name="reason"]', "Under investigation");
  await page.locator("button", { hasText: "Register target" }).click();
  await page.waitForSelector("text=Alice Wanjiru", { timeout: 10000 });

  await expect(
    page.locator("p", { hasText: "tracked by face (enrolled student S1)" })
  ).toBeVisible();

  // An unknown admission number is rejected with the backend's own
  // error message, not silently registered as a nameless target.
  await page.fill('input[name="admission_number"]', "AD999");
  await page.locator("button", { hasText: "Register target" }).click();
  await expect(
    page.getByText("No enrolled student found with admission_number", {
      exact: false,
    })
  ).toBeVisible();
});

test("scene reconstruction maps faces to a location + time window and attaches a sighting to a case", async ({ page }) => {
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      students: [
        {
          student_id: "S1",
          full_name: "Alice Wanjiru",
          admission_number: "AD001",
        },
      ],
      accessLogs: [
        {
          id: 101,
          person_type: "STUDENT",
          person_identifier: "S1",
          entrance: "Library Entrance",
          recognition_score: 0.9,
          liveness_score: 0.8,
          decision: "VERIFIED",
          guard_id: null,
          false_positive: false,
          false_positive_reason: null,
          timestamp: "2026-09-14T09:00:00",
        },
        {
          id: 102,
          person_type: "STUDENT",
          person_identifier: "S1",
          entrance: "Library Entrance",
          recognition_score: 0.9,
          liveness_score: 0.8,
          decision: "VERIFIED",
          guard_id: null,
          false_positive: false,
          false_positive_reason: null,
          timestamp: "2026-09-14T09:10:00",
        },
        {
          // Outside the queried window below — must not show up.
          id: 103,
          person_type: "STUDENT",
          person_identifier: "S1",
          entrance: "Library Entrance",
          recognition_score: 0.9,
          liveness_score: 0.8,
          decision: "VERIFIED",
          guard_id: null,
          false_positive: false,
          false_positive_reason: null,
          timestamp: "2026-09-14T20:00:00",
        },
      ],
    }),
  });
  await page.reload();
  await page.waitForSelector("text=Scene reconstruction", { timeout: 10000 });

  // Open a case first, so the scene result has somewhere to attach to.
  await page.fill('input[name="title"]', "Library incident");
  await page.locator("button", { hasText: "Open case" }).click();
  await page.waitForSelector("text=Library incident", { timeout: 10000 });

  await page.getByLabel("Location", { exact: true }).fill("Library Entrance");
  await page.getByLabel("From", { exact: true }).fill("2026-09-14T08:00");
  await page.getByLabel("To", { exact: true }).fill("2026-09-14T10:00");
  await page.locator("button", { hasText: "Search scene" }).click();

  await expect(page.locator("h3", { hasText: "Alice Wanjiru" })).toBeVisible();
  await expect(
    page.locator("p", { hasText: "seen 2x" })
  ).toBeVisible();

  // The out-of-window sighting (20:00) is excluded from both the
  // per-person summary and the raw sighting timeline.
  await expect(page.getByText("2026-09-14T20:00:00")).toHaveCount(0);

  // Attach Alice's sighting summary to the case just opened.
  await page.getByLabel("Add sighting to case").selectOption("CASE-0001");
  await page.locator("button", { hasText: "Add" }).last().click();
  await expect(page.locator("button", { hasText: "Added" })).toBeVisible();

  // The note actually landed on the case's own timeline.
  await page.locator("button", { hasText: "View notes" }).click();
  await expect(
    page.getByText("Scene reconstruction: Alice Wanjiru", { exact: false })
  ).toBeVisible();
});
