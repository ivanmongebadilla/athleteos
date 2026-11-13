import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: true, workers: 1,
  testMatch: "foundation.spec.ts",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [ { name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "iphone", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } } ],
  webServer: { command: "npm run build && npm run start", url: "http://127.0.0.1:3000", reuseExistingServer: false, env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }, timeout: 180000 }
});
