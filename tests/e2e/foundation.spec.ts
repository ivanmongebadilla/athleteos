import { test, expect } from "@playwright/test";
test("unconfigured workspace explains setup without inventing training data", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("heading", { name: /Your next chapter/ })).toBeVisible();
  await expect(page.getByText("Connection needed")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("setup-light.png"), fullPage: true });
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: testInfo.outputPath("setup-dark.png"), fullPage: true });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("all athlete routes fail closed without configuration", async ({ page }) => {
  for (const route of ["today", "calendar", "coach", "progress", "profile"]) {
    await page.goto(`/${route}`);
    await expect(page).toHaveURL(/\/setup$/);
  }
});
test("login cannot submit when credentials are not configured", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("textbox", { name: "Email address" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sign in", exact: true }).last()).toBeDisabled();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("At least 12 characters.", { exact: false })).toBeVisible();
});
test("invalid email confirmation has a safe local destination", async ({ page }) => {
  await page.goto("/auth/confirm?type=email&next=https://evil.example");
  await expect(page).toHaveURL(/\/login\?error=confirmation$/);
  await expect(page.getByRole("alert")).toBeVisible();
});
