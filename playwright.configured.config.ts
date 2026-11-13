import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// A syntactically configured, signed-out fixture. No real athlete data or keys.
export default defineConfig({
  ...base,
  testMatch: "configured-shell.spec.ts",
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://configured-fixture.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture_not_a_real_key",
    },
    timeout: 180000,
  },
});
