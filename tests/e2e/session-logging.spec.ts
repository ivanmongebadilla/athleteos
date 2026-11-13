import { expect, test, type APIRequestContext } from "@playwright/test";
import type { SectionInput } from "../../src/modules/training/validation";
test.beforeEach(async ({ context, request }) => {
  await request.post("http://127.0.0.1:54329/reset");
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "00000000-0000-4000-8000-000000000021", aud: "authenticated", role: "authenticated", exp: 2208988800, iat: 1735689600 })}.${Buffer.alloc(32).toString("base64url")}`;
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${encode({ access_token: token, refresh_token: "local-fixture", token_type: "bearer", expires_in: 3600, expires_at: 2208988800 })}`, domain: "127.0.0.1", path: "/" }]);
});
async function seed(request: APIRequestContext, format: string, strength = false) {
  const base = "http://127.0.0.1:54329/rest/v1";
  await request.post(`${base}/exercises`, { data: { name: "Back Squat", discipline: "strength", archived: false } });
  const exercises = await (await request.get(`${base}/exercises`)).json();
  const sections: SectionInput[] = [{ kind: "conditioning", format: format as SectionInput["format"], time_cap_seconds: 180, instructions: "21-15-9 · Thrusters + Pull-ups", exercises: [] }];
  if (strength) sections.unshift({ kind: "strength", format: null, time_cap_seconds: null, instructions: "Back Squat 2 × 3", exercises: [{ exercise_id: exercises[0].id, notes: "", sets: [1, 2].map(() => ({ repetitions: 3, load: 185, unit: "lb", percentage: null, target_rpe: 8, rest_seconds: 120 })) }] });
  return (await request.post(`${base}/rpc/save_training_session`, { data: { payload: { id: null, title: "CrossFit 6:00 AM", scheduled_on: "2026-11-12", status: "scheduled", intensity: "moderate", duration_minutes: 60, notes: "", published: true, sections } } })).json() as Promise<string>;
}
test("session-linked blocks save separately, retain unfinished input and preserve revisions", async ({ page, request }, info) => {
  const id = await seed(request, "for_time", true);
  await page.goto(`/sessions/${id}`);
  const strength = page.getByRole("article", { name: "Strength", exact: true });
  const wod = page.getByRole("article", { name: "WOD", exact: true });
  await wod.getByLabel("Your time (Minutes)", { exact: true }).fill("8");
  await wod.getByLabel("Your time (Seconds)", { exact: true }).fill("42");
  const rows = strength.locator(".actual-row");
  for (let index = 0; index < 2; index++) { await rows.nth(index).getByLabel("Reps", { exact: true }).fill("3"); await rows.nth(index).getByLabel("Load", { exact: true }).fill(index ? "195" : "185"); }
  await strength.getByRole("button", { name: "Save Strength", exact: true }).click();
  await expect(strength.locator(".log-save-state")).toHaveText("Completed", { timeout: 15000 });
  await expect(wod.getByLabel("Your time (Minutes)", { exact: true })).toHaveValue("8");
  await expect(wod.getByLabel("Your time (Seconds)", { exact: true })).toHaveValue("42");
  await expect(page.locator(".log-progress")).toContainText("1 / 2");
  await expect(page.getByRole("link", { name: "Edit session", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Use dark theme", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("session-logging-dark.png"), fullPage: true });
  await wod.getByRole("button", { name: "Save WOD", exact: true }).click();
  await expect(page.locator(".log-progress")).toContainText("2 / 2");
  await expect(page.locator(".outline-tag")).toContainText("Completed");
  await strength.locator(".actual-row").first().getByLabel("Load", { exact: true }).fill("190");
  await strength.getByRole("button", { name: "Update Strength", exact: true }).click();
  await expect(strength.locator(".log-history summary")).toContainText("Previous entries (1)");
  await page.reload();
  await expect(strength.locator(".actual-row").first().getByLabel("Load", { exact: true })).toHaveValue("190");
  await expect(strength.locator(".planned-set").first()).toContainText("185 lb");
  await expect(wod.getByLabel("Your time (Minutes)", { exact: true })).toHaveValue("8");
  await expect(wod.getByLabel("Your time (Seconds)", { exact: true })).toHaveValue("42");
  await strength.locator(".log-history summary").click();
  await expect(strength.locator(".log-history")).toContainText("185 lb");
});
test("Spanish AMRAP exposes rounds and extra reps rather than a time-only form", async ({ page, request }) => {
  const id = await seed(request, "amrap");
  await page.goto(`/sessions/${id}`);
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await page.getByLabel("Rondas completas", { exact: true }).fill("8");
  await page.getByLabel("Repeticiones extra", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Escalado", exact: true }).click();
  await expect(page.getByLabel("Tu tiempo (Minutos)", { exact: true })).toHaveCount(1); // optional advanced time only
  await page.getByRole("button", { name: "Guardar WOD", exact: true }).click();
  await expect(page.locator(".log-save-state")).toHaveText("Completado", { timeout: 15000 });
  await page.reload();
  await expect(page.getByLabel("Rondas completas", { exact: true })).toHaveValue("8");
  await expect(page.getByLabel("Repeticiones extra", { exact: true })).toHaveValue("12");
  await expect(page.getByRole("button", { name: "Escalado", exact: true })).toHaveAttribute("aria-pressed", "true");
});
test("EMOM stores a per-minute checklist and restores it on reload", async ({ page, request }) => {
  const id = await seed(request, "emom");
  await page.goto(`/sessions/${id}`);
  await page.getByLabel("Interval 1", { exact: true }).check();
  await page.getByLabel("Interval 3", { exact: true }).check();
  await page.getByRole("button", { name: "Save WOD", exact: true }).click();
  await expect(page.locator(".log-save-state")).toHaveText("Completed", { timeout: 15000 });
  await page.reload();
  await expect(page.getByLabel("Interval 1", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Interval 2", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Interval 3", { exact: true })).toBeChecked();
});
