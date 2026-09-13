import { defineConfig, devices } from "@playwright/test";

// Pre-installed Chromium in this environment — see AGENTS.md-adjacent
// tooling notes. Do not `playwright install`.
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-backend.mjs",
      port: 8000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- -p 3100",
      port: 3100,
      reuseExistingServer: false,
      env: {
        API_BASE_URL: "http://localhost:8000",
        SESSION_SECRET: "test-secret-for-e2e-only",
      },
      timeout: 60000,
    },
  ],
});
