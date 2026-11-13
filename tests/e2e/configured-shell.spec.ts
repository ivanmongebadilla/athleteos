import { expect, test } from "@playwright/test";

test("configured login has no setup navigation or setup-required labels", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Welcome to/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Workspace setup" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View setup instructions" })).toHaveCount(0);
  await expect(page.getByText("Setup required", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Getting started", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Email address" })).toBeEnabled();
  await expect(page.locator(".sidebar, .mobile-nav, .avatar")).toHaveCount(0);
  await expect(page.locator(".public-header .brand")).toHaveAttribute("href", "/");
});

test("public landing is responsive and has working account navigation", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Built for your next best/ })).toBeVisible();
  await expect(page.locator(".sidebar, .mobile-nav, .avatar")).toHaveCount(0);
  await expect(page.getByRole("img", { name: /weightlifter/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("landing-en.png"), fullPage: true });
  await page.screenshot({ path: testInfo.outputPath("landing-hero-en.png") });
  await page.getByRole("link", { name: "Begin your journey" }).click();
  await expect(page).toHaveURL(/\/login\?mode=signup$/);
  await expect(page.getByText("At least 12 characters.", { exact: false })).toBeVisible();
});

test("Spanish choice translates pages and persists through reload and auth errors", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1, name: /Tu siguiente mejor versión/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("landing-hero-es.png") });
  await page.reload();
  await expect(page.getByRole("heading", { name: /El progreso no es casualidad/ })).toBeVisible();
  await page.getByRole("link", { name: "Empieza tu camino" }).click();
  await expect(page.getByLabel("Correo electrónico", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
  await expect(page.getByText("Al menos 12 caracteres.", { exact: false })).toBeVisible();
  await page.goto("/auth/confirm?type=email");
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3000");
  await expect(page.getByRole("alert").filter({ hasText: "Este enlace no pudo completar" })).toBeVisible();
  await page.getByRole("combobox", { name: "Idioma", exact: true }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
});

test("configured setup redirects signed-out athletes to login", async ({ page }) => {
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /Welcome to/ })).toBeVisible();
});
