import { test, expect } from "@playwright/test";

const ACCOUNTS: Array<{
  username: string;
  password: string;
  dashboardPath: string;
}> = [
  { username: "original1", password: "correct", dashboardPath: "/dashboard/original_admin_dashboard" },
  { username: "security1", password: "correct", dashboardPath: "/dashboard/security_admin_dashboard" },
  { username: "tt1", password: "correct", dashboardPath: "/dashboard/timetabling_admin_dashboard" },
  { username: "dean1", password: "correct", dashboardPath: "/dashboard/dean_admin_dashboard" },
  { username: "temp1", password: "correct", dashboardPath: "/dashboard/enrollment_dashboard" },
  { username: "guard1", password: "correct", dashboardPath: "/dashboard/guard_dashboard" },
];

test.beforeEach(async () => {
  await fetch("http://localhost:8000/__reset", { method: "POST" });
});

for (const account of ACCOUNTS) {
  test(`${account.username} logs in and lands on their own dashboard`, async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="username"]', account.username);
    await page.fill('input[name="password"]', account.password);
    await page.locator("button", { hasText: "Sign in" }).click();
    await page.waitForURL(`**${account.dashboardPath}`, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(account.dashboardPath.replace(/\//g, "\\/")));
  });
}

test("wrong password is rejected with an error, not a redirect", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "original1");
  await page.fill('input[name="password"]', "wrong-password");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/\/login$/);
});

test("an already-logged-in visitor is bounced away from /login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "tt1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/timetabling_admin_dashboard", { timeout: 10000 });

  await page.goto("/login");
  await page.waitForURL("**/dashboard/timetabling_admin_dashboard", { timeout: 10000 });
});

test("a logged-in user requesting another role's dashboard is bounced to their own", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "tt1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/timetabling_admin_dashboard", { timeout: 10000 });

  await page.goto("/dashboard/original_admin_dashboard");
  await page.waitForURL("**/dashboard/timetabling_admin_dashboard", { timeout: 10000 });
});

test("signing out clears the session and returns to login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "guard1");
  await page.fill('input[name="password"]', "correct");
  await page.locator("button", { hasText: "Sign in" }).click();
  await page.waitForURL("**/dashboard/guard_dashboard", { timeout: 10000 });

  await page.locator("button", { hasText: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 10000 });

  // Session is really gone, not just a client-side navigation —
  // requesting the dashboard directly bounces back to /login.
  await page.goto("/dashboard/guard_dashboard");
  await page.waitForURL("**/login", { timeout: 10000 });
});
