import { test, expect } from "@playwright/test";

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
});

test("a Temporary Admin can enroll a new user from the Enrollment Dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "temp1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/enrollment_dashboard", { timeout: 10000 });

  await expect(
    page.getByRole("heading", { name: "Enrollment Dashboard" })
  ).toBeVisible();

  await page.fill('input[name="username"]', "guard2");
  await page.fill('input[name="password"]', "temp-pass-123");
  await page.fill('input[name="email"]', "guard2@example.com");
  await page.selectOption('select[name="role"]', "GUARD");
  await page.locator("button", { hasText: "Enroll" }).click();
  await page.waitForSelector("text=Created guard2", { timeout: 10000 });
});

test("a non-admin role cannot reach /enroll directly", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "guard1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/guard_dashboard", { timeout: 10000 });

  await page.goto("/enroll");
  await page.waitForURL("**/dashboard/guard_dashboard", { timeout: 10000 });
});
