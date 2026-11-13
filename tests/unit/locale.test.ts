import { describe, expect, it } from "vitest";
import { isLocale, normalizeLocale } from "../../src/lib/i18n/messages";
describe("locale input boundaries", () => {
  it("accepts only supported explicit locale values", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(normalizeLocale("es")).toBe("es");
  });
  it.each([undefined, null, "fr", "ES", "es-MX", "../../es", "<script>"])("falls back for unsupported cookie input %s", value => {
    expect(isLocale(value)).toBe(false);
    expect(normalizeLocale(value)).toBe("en");
  });
});
