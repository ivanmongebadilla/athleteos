import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Development only: no production build, no real accounts or Supabase data.
export default defineConfig({ ...base, testMatch: "calendar-today.spec.ts", use: { ...base.use, baseURL: "http://127.0.0.1:3001" }, webServer: [
  { command: "node tests/fixtures/training-server.mjs", url: "http://127.0.0.1:54329/health", reuseExistingServer: false },
  { command: "npm run dev -- --port 3001", url: "http://127.0.0.1:3001", reuseExistingServer: false, env: { ATHLETEOS_CALENDAR_TEST: "1", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_training_fixture" }, timeout: 120000 },
] });
