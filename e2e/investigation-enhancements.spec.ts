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

test("a case's severity and assignee can be set at creation and edited afterward", async ({ page }) => {
  await page.fill('input[name="title"]', "Suspicious package");
  await page.selectOption('select[name="severity"]', "HIGH");
  await page.fill('input[name="assigned_to"]', "security1");
  await page.locator("button", { hasText: "Open case" }).click();
  await page.waitForSelector("text=Suspicious package", { timeout: 10000 });

  const caseCard = page.getByTestId("case-CASE-0001");
  await expect(caseCard.locator("span", { hasText: "HIGH" })).toBeVisible();
  await expect(caseCard).toContainText("assigned to security1");

  await caseCard.locator("button", { hasText: "Edit" }).click();
  await caseCard.getByLabel("Edit severity").selectOption("CRITICAL");
  await caseCard.getByLabel("Edit assigned to").fill("original1");
  await caseCard.locator("button", { hasText: "Save" }).click();

  await expect(caseCard.locator("span", { hasText: "CRITICAL" })).toBeVisible();
  await expect(caseCard).toContainText("assigned to original1");
});

test("a case can link more than one target and an unknown-person sighting", async ({ page }) => {
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pendingUnknowns: [
        {
          unknown_id: "UNK-1",
          image_path: "/data/unknowns/unk1.jpg",
          status: "PENDING_REVIEW",
          detected_at: "2026-09-14T10:00:00",
        },
      ],
    }),
  });
  await page.reload();
  await page.waitForSelector("text=No cases yet.", { timeout: 10000 });

  // Register two targets.
  await page.fill('input[name="full_name"]', "Person Alpha");
  await page.locator("button", { hasText: "Register target" }).click();
  await page.waitForSelector("text=Person Alpha", { timeout: 10000 });

  await page.fill('input[name="full_name"]', "Person Beta");
  await page.locator("button", { hasText: "Register target" }).click();
  await page.waitForSelector("text=Person Beta", { timeout: 10000 });

  // Open a case linked to the first target only.
  await page.fill('input[name="title"]', "Multi-suspect incident");
  await page.selectOption('select[name="target_id"]', "TGT-0001");
  await page.locator("button", { hasText: "Open case" }).click();
  await page.waitForSelector("text=Multi-suspect incident", { timeout: 10000 });

  const caseCard = page.getByTestId("case-CASE-0001");
  await caseCard.locator("button", { hasText: "View details" }).click();

  // Scoped to the specific <p> lines below, not the whole card — the
  // link pickers' own <option> text ("TGT-0002 — Person Beta") would
  // otherwise make a card-wide text assertion pass even when nothing
  // was actually linked, since toContainText checks textContent
  // regardless of visibility.
  const linkedTargetsLine = caseCard.locator("p", { hasText: "Linked targets:" });
  const linkedUnknownsLine = caseCard.locator("p", { hasText: "Linked unknown sightings:" });

  await expect(linkedTargetsLine).toContainText("Person Alpha");

  // Link the second target too. "Link" (exact) avoids matching
  // "Unlink Person Alpha", which also contains the substring "Link".
  await caseCard.getByLabel("Link another target").selectOption("TGT-0002");
  await caseCard.locator("button", { hasText: /^Link$/ }).first().click();
  await expect(linkedTargetsLine).toContainText("Person Beta");

  // Unlink the first (primary) target — the link row goes, the
  // second target remains.
  await caseCard.locator("button", { hasText: "Unlink Person Alpha" }).click();
  await expect(caseCard.locator("button", { hasText: "Unlink Person Alpha" })).toHaveCount(0);
  await expect(linkedTargetsLine).toContainText("Person Beta");
  await expect(linkedTargetsLine).not.toContainText("Person Alpha");

  // Link the unknown-person sighting.
  await caseCard.getByLabel("Link an unknown sighting").selectOption("UNK-1");
  await caseCard.locator("button", { hasText: /^Link$/ }).last().click();
  await expect(linkedUnknownsLine).toContainText("UNK-1");

  await caseCard.locator("button", { hasText: "Unlink UNK-1" }).click();
  await expect(caseCard.locator("button", { hasText: "Unlink UNK-1" })).toHaveCount(0);
  await expect(linkedUnknownsLine).toContainText("none");
});

test("a pending target alert shows in the banner and disappears once acknowledged", async ({ page }) => {
  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      watchlist: [
        {
          target_id: "TGT-0001",
          full_name: "Person Of Interest",
          description: null,
          reason: "Reported theft",
          status: "ACTIVE",
          embedding_file: "TGT-0001.npy",
          linked_student_id: null,
          created_by: "security1",
          created_at: "2026-09-14T00:00:00",
          resolved_by: null,
          resolved_at: null,
        },
      ],
      accessLogs: [
        {
          id: 201,
          person_type: "TARGET",
          person_identifier: "TGT-0001",
          entrance: "Main Gate",
          recognition_score: 0.9,
          liveness_score: 0.8,
          decision: "TARGET_ALERT",
          guard_id: null,
          false_positive: false,
          false_positive_reason: null,
          timestamp: "2026-09-14T10:00:00",
        },
      ],
    }),
  });
  await page.reload();

  await expect(page.locator("h2", { hasText: "Target alerts" })).toBeVisible();
  const alertCard = page.getByTestId("alert-201");
  await expect(alertCard).toContainText("Person Of Interest");
  await expect(alertCard).toContainText("Reported theft");
  await expect(alertCard).toContainText("Main Gate");

  await alertCard.locator("button", { hasText: "Acknowledge" }).click();
  await expect(page.locator("h2", { hasText: "Target alerts" })).toHaveCount(0);
});

test("target sighting frequency shows a per-location breakdown, highest first", async ({ page }) => {
  await page.fill('input[name="full_name"]', "Person Of Interest");
  await page.locator("button", { hasText: "Register target" }).click();
  await page.waitForSelector("text=Person Of Interest", { timeout: 10000 });

  await fetch("http://localhost:8000/__seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessLogs: [
        {
          id: 301,
          person_type: "TARGET",
          person_identifier: "TGT-0001",
          entrance: "Main Gate",
          decision: "TARGET_ALERT",
          timestamp: "2026-09-14T09:00:00",
        },
        {
          id: 302,
          person_type: "TARGET",
          person_identifier: "TGT-0001",
          entrance: "Main Gate",
          decision: "TARGET_ALERT",
          timestamp: "2026-09-14T09:10:00",
        },
        {
          id: 303,
          person_type: "TARGET",
          person_identifier: "TGT-0001",
          entrance: "Side Gate",
          decision: "TARGET_ALERT",
          timestamp: "2026-09-14T09:20:00",
        },
      ],
    }),
  });

  const targetCard = page.getByTestId("target-TGT-0001");
  await targetCard.locator("button", { hasText: "View frequency" }).click();

  await expect(targetCard).toContainText("Main Gate (2)");
  await expect(targetCard).toContainText("Side Gate (1)");
});

test("printing a case report opens a formatted summary in a new tab", async ({ page }) => {
  await page.fill('input[name="title"]', "Report smoke test");
  await page.locator("button", { hasText: "Open case" }).click();
  await page.waitForSelector("text=Report smoke test", { timeout: 10000 });

  const caseCard = page.getByTestId("case-CASE-0001");
  await caseCard.locator("button", { hasText: "View details" }).click();

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    caseCard.locator("button", { hasText: "Print report" }).click(),
  ]);

  await popup.waitForLoadState();
  await expect(popup.locator("h1")).toHaveText("Report smoke test");
  await expect(popup.locator("body")).toContainText("CASE-0001");
});
