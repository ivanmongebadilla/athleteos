import { expect, type Page } from "@playwright/test";
// Creation dates in these fixtures are deliberately fixed, so reopen through
// Calendar rather than assuming they match the machine's current date.
export async function openSavedSession(page: Page, title: string, date = "2026-11-12") {
  await expect(page).toHaveURL(/\/today$/, { timeout: 20000 });
  await page.goto(`/calendar?date=${date}&view=week`);
  await page.locator(".session-card").filter({ hasText: title }).getByRole("link").click();
}
