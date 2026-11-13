import { expect, test } from "@playwright/test";
import { localDate } from "../../src/modules/training/calendar";

test.beforeEach(async ({ context, request }) => {
  await request.post("http://127.0.0.1:54329/reset");
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "00000000-0000-4000-8000-000000000021", aud: "authenticated", role: "authenticated", exp: 2208988800, iat: 1735689600 })}.${Buffer.alloc(32).toString("base64url")}`;
  await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${encode({ access_token: token, refresh_token: "local-fixture", token_type: "bearer", expires_in: 3600, expires_at: 2208988800 })}`, domain: "127.0.0.1", path: "/" }]);
});

for (const view of ["month", "week"] as const) {
  test(`Today returns from a different ${view} and works repeatedly on the current date`, async ({ page }, info) => {
    const today = localDate("America/Tijuana");
    await page.goto(`/calendar?date=2020-01-01&view=${view}`);
    const button = page.getByRole("button", { name: "Today", exact: true });
    await button.click();
    await expect(page).toHaveURL(`/calendar?date=${today}&view=${view}`);
    const cell = page.locator('.calendar-day[aria-current="date"]');
    await expect(cell).toBeFocused();
    await expect(cell).toBeInViewport();
    await expect(cell.locator("time")).toHaveAttribute("datetime", today);
    await button.click();
    await expect(cell).toBeFocused();
    await expect(cell).toBeInViewport();
    await expect(page.locator(".calendar-grid")).toHaveClass(`calendar-grid ${view}`);
    await page.screenshot({ path: info.outputPath(`today-${view}.png`) });
  });
}
