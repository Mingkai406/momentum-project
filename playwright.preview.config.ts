import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/preview",
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: "list",
  outputDir: "test-results/preview",
  use: {
    baseURL: "http://127.0.0.1:3200/momentum-project/",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/serve-preview.mjs",
    url: "http://127.0.0.1:3200/momentum-project/welcome/",
    reuseExistingServer: false,
  },
});
