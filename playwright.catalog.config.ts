import { defineConfig } from "@playwright/test";
import development from "./playwright.calendar.config";
// Dynamic session routes compile on first use in development; allow navigation
// assertions to outlive that compilation without adding arbitrary sleeps.
export default defineConfig({...development,timeout:60000,expect:{timeout:20000},testMatch:["exercise-catalog.spec.ts","session-editor.spec.ts","training.spec.ts","session-logging.spec.ts"]});
