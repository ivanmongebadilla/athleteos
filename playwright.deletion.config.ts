import {defineConfig} from "@playwright/test";
import development from "./playwright.calendar.config";
export default defineConfig({...development,timeout:60000,expect:{timeout:20000},testMatch:["session-deletion.spec.ts"]});
