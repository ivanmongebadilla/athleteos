import { defineConfig } from "@playwright/test";
import development from "./playwright.calendar.config";
export default defineConfig({...development,timeout:60000,expect:{timeout:20000},testMatch:["progress.spec.ts","exercise-catalog.spec.ts","training.spec.ts"]});
