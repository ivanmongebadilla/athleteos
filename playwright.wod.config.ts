import { defineConfig } from "@playwright/test";
import development from "./playwright.calendar.config";
export default defineConfig({...development,timeout:90000,expect:{timeout:20000},testMatch:["session-logging.spec.ts","session-editor.spec.ts","training.spec.ts"]});
