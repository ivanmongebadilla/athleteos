import { defineConfig } from "@playwright/test";
import development from "./playwright.calendar.config";
export default defineConfig({ ...development, timeout: 60000, testMatch: "session-logging.spec.ts" });
