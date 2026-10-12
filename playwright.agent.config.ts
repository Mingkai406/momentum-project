import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/agent-browser",
  workers: 1,
  retries: 0,
  timeout: 60000,
  outputDir: "test-results/agent",
  use: { baseURL: "http://127.0.0.1:3300", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node tests/helpers/followup-stack.mjs",
    url: "http://127.0.0.1:3300/login",
    timeout: 120000,
    reuseExistingServer: false,
    env: { WEB_PORT: "3300", API_PORT: "3301", MOMENTUM_EPHEMERAL: "true" },
  },
});
