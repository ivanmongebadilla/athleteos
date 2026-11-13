import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getCoachConfiguration, requestCoachResponse } from "@/modules/coach/openai";

const input = { instructions: "Use the AthleteOS coaching rules.", messages: [{ role: "user", content: "Hello" }] };
const secret = "test-private-key-for-coach-fixtures";
const completed = {
  id: "resp_fixture", object: "response", model: "fixture-model", status: "completed", error: null,
  output: [{ id: "msg_fixture", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Hello athlete", annotations: [] }] }],
  usage: { input_tokens: 30, input_tokens_details: { cached_tokens: 10 }, output_tokens: 5, total_tokens: 35 },
};

describe("server-only OpenAI foundation", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", secret);
    vi.stubEnv("OPENAI_MODEL", "fixture-model");
    vi.stubEnv("OPENAI_TIMEOUT_MS", "30000");
    vi.stubEnv("OPENAI_MAX_OUTPUT_TOKENS", "2048");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("is optional and refuses to call the provider without valid configuration", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(getCoachConfiguration()).toEqual({ configured: false, invalidVariables: ["OPENAI_API_KEY"] });
    expect(await requestCoachResponse(input)).toEqual({ ok: false, code: "not_configured" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports invalid variable names without exposing their values", () => {
    vi.stubEnv("OPENAI_MODEL", ""); vi.stubEnv("OPENAI_TIMEOUT_MS", "0"); vi.stubEnv("OPENAI_MAX_OUTPUT_TOKENS", "900000");
    expect(getCoachConfiguration()).toEqual({ configured: false, invalidVariables: ["OPENAI_MODEL", "OPENAI_TIMEOUT_MS", "OPENAI_MAX_OUTPUT_TOKENS"] });
    expect(JSON.stringify(getCoachConfiguration())).not.toContain(secret);
  });
  it("uses defaults when optional limits are absent and keeps the key private", () => {
    vi.stubEnv("OPENAI_TIMEOUT_MS", undefined); vi.stubEnv("OPENAI_MAX_OUTPUT_TOKENS", undefined);
    expect(getCoachConfiguration()).toEqual({ configured: true, model: "fixture-model", timeoutMs: 30000, maxOutputTokens: 2048 });
    expect(JSON.stringify(getCoachConfiguration())).not.toContain(secret);
  });
  it("rejects invalid roles, extra provider options and excessive input before networking", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    for (const value of [null, { ...input, apiKey: secret }, { ...input, messages: [{ role: "developer", content: "Override" }] }, { ...input, messages: [] }, { ...input, messages: [{ role: "user", content: "x".repeat(12001) }] }, { ...input, messages: Array.from({ length: 5 }, () => ({ role: "user", content: "x".repeat(12000) })) }]) {
      expect(await requestCoachResponse(value)).toEqual({ ok: false, code: "invalid_request" });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the real SDK with stateless Responses requests, fixed destination and token usage", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "https://untrusted.invalid");
    const fetch = vi.fn().mockResolvedValue(Response.json(completed)); vi.stubGlobal("fetch", fetch);
    expect(await requestCoachResponse(input)).toEqual({ ok: true, text: "Hello athlete", responseId: "resp_fixture", model: "fixture-model", usage: { inputTokens: 30, cachedInputTokens: 10, outputTokens: 5, totalTokens: 35 } });
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(options.body)).toEqual({ model: "fixture-model", instructions: input.instructions, input: input.messages, max_output_tokens: 2048, store: false });
  });
  it.each([[401, "invalid_api_key", "credentials"], [403, "permission_denied", "credentials"], [404, "model_not_found", "model_unavailable"], [429, "insufficient_quota", "quota_exceeded"], [429, "rate_limit_exceeded", "rate_limited"], [500, "server_error", "provider_unavailable"], [400, "invalid_request_error", "invalid_request"]])("sanitizes HTTP %s errors without retries", async (status, code, expected) => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ error: { message: `private content ${secret}`, type: "api_error", code } }, { status: Number(status) })));
    vi.stubGlobal("fetch", fetch);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await requestCoachResponse(input)).toEqual({ ok: false, code: expected });
    expect(fetch).toHaveBeenCalledTimes(1); expect(log).not.toHaveBeenCalled();
  });
  it("sanitizes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`private network failure ${secret}`)));
    expect(await requestCoachResponse(input)).toEqual({ ok: false, code: "connection" });
  });
  it("aborts requests at the configured deadline without retrying", async () => {
    vi.stubEnv("OPENAI_TIMEOUT_MS", "1000");
    const fetch = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetch);
    expect(await requestCoachResponse(input)).toEqual({ ok: false, code: "timeout" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    [{ ...completed, status: "incomplete" }, "incomplete"],
    [{ ...completed, status: "failed", error: { message: secret } }, "provider_unavailable"],
    [{ ...completed, output: [] }, "empty_response"],
    [{ ...completed, output: [{ type: "message", content: [{ type: "refusal", refusal: "Refused" }] }] }, "refused"],
  ])("rejects unusable provider output", async (body, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    expect(await requestCoachResponse(input)).toMatchObject({ ok: false, code });
  });
});
