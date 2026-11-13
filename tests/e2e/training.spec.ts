import { expect, test } from "@playwright/test";
import { openSavedSession } from "./helpers/saved-session";
test.beforeEach(async ({ context, request }) => {
  await request.post("http://127.0.0.1:54329/reset");
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "00000000-0000-4000-8000-000000000021", aud: "authenticated", role: "authenticated", exp: 2208988800, iat: 1735689600 })}.${Buffer.alloc(32).toString("base64url")}`;
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${encode({ access_token: token, refresh_token: "local-fixture", token_type: "bearer", expires_in: 3600, expires_at: 2208988800 })}`, domain: "127.0.0.1", path: "/" }]);
});
test("athlete onboarding persists and Spanish forms remain responsive", async ({ page }, info) => {
  await page.goto("/today"); await expect(page.getByRole("heading", { name: "Start with your athlete profile" })).toBeVisible();
  await page.getByRole("link", { name: /Edit profile/ }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test Athlete");
  await page.getByLabel("Primary goals", { exact: true }).fill("Olympic lifting, CrossFit");
  await page.getByLabel("Available equipment", { exact: true }).fill("Barbell, Pull-up bar");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved successfully");
  await page.reload(); await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Test Athlete");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Perfil del atleta." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Objetivos principales", exact: true })).toHaveValue("Olympic lifting, CrossFit");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("profile-es.png"), fullPage: true });
});
test("create PR, structure and reschedule a session, log different actual loads, preserve history", async ({ page }, info) => {
  await page.goto("/progress?tab=library");
  await page.getByLabel("Exercise name", { exact: true }).fill("Back Squat");
  await page.getByLabel("Discipline", { exact: true }).selectOption("strength");
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  await expect(page.locator(".exercise-row")).toContainText("Back Squat");
  const recordForm = page.locator("form").filter({ has: page.getByLabel("Date achieved", { exact: true }) });
  await recordForm.getByLabel("Exercise", { exact: true }).selectOption({ label: "Back Squat" });
  await recordForm.getByLabel("Load", { exact: true }).fill("120");
  await recordForm.getByRole("button", { name: "Add historical PR", exact: true }).click();
  await expect(page.locator("table")).toContainText("120 kg");
  await page.goto("/sessions/new?date=2026-11-12");
  await page.getByLabel("Session title", { exact: true }).fill("Squat practice");
  await page.getByRole("button", { name: "Strength", exact: true }).click();
  await page.getByRole("button", { name: "Add movement", exact: true }).click();
  await page.getByLabel("Movement", { exact: true }).selectOption({ label: "Back Squat" });
  await page.getByLabel("Loading method", { exact: true }).selectOption("weight");
  await page.locator(".load-control").getByLabel("Load", { exact: true }).fill("100");
  await page.getByLabel("Publish session", { exact: true }).check();
  await page.getByRole("button", { name: "Save & publish" }).click();
  await openSavedSession(page, "Squat practice");
  await expect(page.getByRole("heading", { name: "Prescription", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit session", exact: true }).click();
  await page.getByLabel("Training date", { exact: true }).fill("2026-11-13");
  await page.getByRole("button", { name: "Save & publish" }).click();
  await openSavedSession(page, "Squat practice", "2026-11-13");
  await expect(page.locator(".outline-tag")).toContainText("2026-11-13");
  const actualRows = page.locator(".actual-row");
  for (let index = 0; index < 3; index++) {
    await actualRows.nth(index).getByLabel("Reps", { exact: true }).fill("4");
    await actualRows.nth(index).getByLabel("Load", { exact: true }).fill("95");
  }
  await page.getByRole("button", { name: "Save Strength", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workout history", exact: true })).toBeVisible();
  await expect(page.locator(".planned-set").first()).toContainText("100 kg");
  await expect(page.locator(".actual-row").first().getByLabel("Load", { exact: true })).toHaveValue("95");
  await expect(page.getByRole("link", { name: "Edit session", exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("session-completed.png"), fullPage: true });
  await page.goto("/calendar?date=2026-11-13&view=week");
  await expect(page.locator(".session-card")).toContainText("Squat practice");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("calendar-week.png"), fullPage: true });
  await page.getByRole("link", { name: "Month", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(42);
  await page.goto("/progress?tab=library"); await expect(page.locator("table")).toContainText("120 kg");
});


