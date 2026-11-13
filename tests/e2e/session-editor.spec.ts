import { expect, test } from "@playwright/test";
import { openSavedSession } from "./helpers/saved-session";
test.setTimeout(60000);

test.beforeEach(async ({ context, request }) => {
  await request.post("http://127.0.0.1:54329/reset");
  for (const name of ["Back Squat", "Thrusters", "Pull-ups"]) await request.post("http://127.0.0.1:54329/rest/v1/exercises", { data: { name, discipline: "strength" } });
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "00000000-0000-4000-8000-000000000021", aud: "authenticated", role: "authenticated", exp: 2208988800, iat: 1735689600 })}.${Buffer.alloc(32).toString("base64url")}`;
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${encode({ access_token: token, refresh_token: "local-fixture", token_type: "bearer", expires_in: 3600, expires_at: 2208988800 })}`, domain: "127.0.0.1", path: "/" }]);
});

test("independent strength and WOD blocks preview, reorder, save and reopen intact", async ({ page }, info) => {
  await page.goto("/sessions/new?date=2026-11-12");
  await expect(page.locator(".builder-block")).toHaveCount(0);
  await page.getByLabel("Session title", { exact: true }).fill("CrossFit 6:00 AM");
  await page.getByRole("button", { name: "Strength", exact: true }).click();
  const strength = page.locator(".builder-block").filter({ has: page.getByRole("heading", { name: "Strength", exact: true }) });
  await strength.getByRole("button", { name: "Add movement", exact: true }).click();
  await strength.getByLabel("Movement", { exact: true }).selectOption({ label: "Back Squat" });
  await strength.locator(".reps-sets").getByLabel("Reps", { exact: true }).fill("3");
  await strength.locator(".reps-sets").getByLabel("Sets", { exact: true }).fill("5");
  await strength.getByLabel("Loading method", { exact: true }).selectOption("percent");
  await page.getByRole("button", { name: "WOD", exact: true }).click();
  const wod = page.locator(".builder-block").filter({ has: page.getByRole("heading", { name: "WOD", exact: true }) });
  await wod.getByLabel("Time cap (min)", { exact: true }).fill("12");
  await wod.getByLabel("Instructions / rep scheme", { exact: true }).fill("21-15-9");
  await wod.getByRole("button", { name: "AMRAP", exact: true }).click();
  await wod.getByRole("button", { name: "Add movement", exact: true }).click();
  await wod.getByLabel("Movement", { exact: true }).selectOption({ label: "Thrusters" });
  await wod.getByLabel("Details / load", { exact: true }).fill("95 / 65 lb");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("80%");
  await expect(page.getByRole("dialog")).toContainText("21-15-9");
  await expect(page.getByRole("dialog")).toContainText("95 / 65 lb");
  await page.keyboard.press("Escape");
  await wod.getByRole("button", { name: "Move up: WOD 2", exact: true }).click();
  await expect(page.locator(".builder-block").first()).toContainText("WOD");
  // Switching to rest and back must not discard the unsaved plan.
  await page.locator(".builder-settings .builder-options summary").click();
  await page.getByLabel("This is a rest day", { exact: true }).check();
  await expect(page.locator(".builder-block")).toHaveCount(0);
  await page.getByLabel("This is a rest day", { exact: true }).uncheck();
  await expect(page.locator(".builder-block")).toHaveCount(2);
  await page.locator(".builder-settings .builder-options summary").click();
  await wod.getByRole("button", { name: "Move down: WOD 1", exact: true }).click();
  await page.getByRole("button", { name: "Use dark theme", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("session-builder-dark.png"), fullPage: true });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await openSavedSession(page, "CrossFit 6:00 AM");
  await expect(page.getByRole("heading", { name: "Prescription", exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".workout-section").last()).toContainText("AMRAP");
  await expect(page.locator(".workout-section").last()).toContainText("12:00");
  await page.getByRole("link", { name: "Edit session", exact: true }).click();
  await expect(page.getByLabel("Instructions / rep scheme", { exact: true })).toHaveValue("21-15-9");
  await expect(page.locator(".reps-sets").getByLabel("Sets", { exact: true })).toHaveValue("5");
});

test("Spanish WOD-only session has no forced warm-up or strength section", async ({ page }, info) => {
  await page.goto("/sessions/new?date=2026-11-12");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await page.getByLabel("Título de la sesión", { exact: true }).fill("Solo WOD");
  await page.getByRole("button", { name: "WOD", exact: true }).click();
  await page.getByLabel("Instrucciones / esquema de repeticiones", { exact: true }).fill("10 rondas al ritmo indicado");
  await expect(page.locator(".builder-block")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Por tiempo", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: info.outputPath("session-builder-es.png"), fullPage: true });
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await openSavedSession(page, "Solo WOD");
  await expect(page.getByRole("heading", { name: "Prescripción", exact: true })).toBeVisible();
  await expect(page.locator(".workout-section")).toHaveCount(1);
  await expect(page.locator(".workout-section")).toContainText("10 rondas");
});

test("publication beside Save makes a draft ready for logging", async ({ page }, info) => {
  await page.goto("/sessions/new?date=2026-11-12");
  await page.getByLabel("Session title", { exact: true }).fill("Draft to ready");
  await page.getByRole("button", { name: "Warm-up", exact: true }).click();
  const footer = page.locator(".builder-form > .training-actions");
  await expect(footer.getByRole("checkbox", { name: "Publish session", exact: true })).not.toBeChecked();
  await expect(footer).toContainText("Publish it when ready to log results");
  await footer.getByRole("button", { name: "Save draft", exact: true }).click();
  await openSavedSession(page, "Draft to ready");
  await expect(page.getByRole("link", { name: "Edit session", exact: true })).toBeVisible();
  await expect(page.locator(".section-log-form")).toHaveCount(0);
  await page.getByRole("link", { name: "Edit session", exact: true }).click();
  await footer.getByRole("checkbox", { name: "Publish session", exact: true }).check();
  await expect(footer).toContainText("Saving enables result logging");
  await expect(footer).toContainText("Only you can see it");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await footer.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("session-publication-footer.png"), fullPage: true });
  await footer.getByRole("button", { name: "Save & publish", exact: true }).click();
  await openSavedSession(page, "Draft to ready");
  await expect(page.locator(".section-log-form")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".section-log-form")).toHaveCount(1);
});

test("sections collapse independently, retain entries and expand for invalid fields", async ({ page }, info) => {
  await page.goto("/sessions/new?date=2026-11-12");
  await page.getByLabel("Session title", { exact: true }).fill("Collapsible workout");
  await page.getByRole("button", { name: "Warm-up", exact: true }).click();
  await expect(page.locator(".builder-block")).toHaveCount(1);
  await page.getByRole("button", { name: "WOD", exact: true }).click();
  const warmup = page.getByRole("region", { name: "1. Warm-up", exact: true });
  const wod = page.getByRole("region", { name: "2. WOD", exact: true });
  const toggle = warmup.locator(".block-collapse-toggle");
  await warmup.getByLabel("Instructions", { exact: true }).fill("Easy row for five minutes");
  await wod.getByLabel("Instructions / rep scheme", { exact: true }).fill("21-15-9");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(warmup.getByLabel("Instructions", { exact: true })).toBeHidden();
  await expect(wod.getByLabel("Instructions / rep scheme", { exact: true })).toBeVisible();
  // Keyboard activation works and text stays intact.
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(warmup.getByLabel("Instructions", { exact: true })).toHaveValue("Easy row for five minutes");
  await warmup.getByRole("button", { name: "Add movement", exact: true }).click();
  await toggle.click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(warmup.getByLabel("Movement", { exact: true })).toBeFocused();
  await warmup.getByLabel("Movement", { exact: true }).selectOption({ label: "Back Squat" });
  await toggle.click();
  await warmup.getByRole("button", { name: "Move down: Warm-up 1", exact: true }).click();
  await expect(page.locator(".builder-block").last().locator(".block-collapse-toggle")).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Easy row for five minutes");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: info.outputPath("collapsed-sections.png"), fullPage: true });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await openSavedSession(page, "Collapsible workout");
  await expect(page.getByRole("heading", { name: "Prescription", exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".workout-section")).toHaveCount(2);
  await expect(page.locator(".workout-section").last()).toContainText("Easy row for five minutes");
});

