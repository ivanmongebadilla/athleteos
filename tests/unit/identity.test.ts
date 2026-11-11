import { describe, expect, it } from "vitest";
import { credentialsSchema, loginSchema } from "../../src/modules/identity/validation";
import { parseSupabaseEnv } from "../../src/lib/env";
describe("authentication input boundaries", () => {
  it("rejects malformed emails and short signup passwords", () => {
    expect(credentialsSchema.safeParse({ email: "invalid", password: "123456789012" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "athlete@example.com", password: "short" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "athlete@example.com", password: "long-enough-password" }).success).toBe(true);
  });
  it("allows existing credentials without applying signup password requirements", () => {
    expect(loginSchema.safeParse({ email: "athlete@example.com", password: "existing" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "athlete@example.com", password: "" }).success).toBe(false);
  });
  it("fails closed when Supabase configuration is absent or placeholder", () => {
    expect(parseSupabaseEnv()).toBeNull();
    expect(parseSupabaseEnv("not-url", "x".repeat(30))).toBeNull();
    expect(parseSupabaseEnv("javascript:alert(1)", "x".repeat(30))).toBeNull();
    expect(parseSupabaseEnv("https://example.supabase.co", "replace-with-local-or-hosted-publishable-key")).toBeNull();
    expect(parseSupabaseEnv("https://example.supabase.co", "sb_publishable_" + "x".repeat(30))).not.toBeNull();
  });
});
