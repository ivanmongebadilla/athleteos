import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testMatch: "training.spec.ts", webServer: [
  { command: "node tests/fixtures/training-server.mjs", url: "http://127.0.0.1:54329/health", reuseExistingServer: false },
  { command: "npm run build && npm run start", url: "http://127.0.0.1:3000", reuseExistingServer: false, env: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_training_fixture" }, timeout: 180000 },
] });
