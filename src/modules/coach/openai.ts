import "server-only";
import OpenAI from "openai";
import { z } from "zod";

const configurationSchema = z.object({
  apiKey: z.string().trim().min(20).refine(value => !/replace|your[-_ ]|example/i.test(value) && !/\s/.test(value)),
  model: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9._:-]+$/).refine(value => !/replace|your[-_ ]/i.test(value)),
  timeoutMs: z.coerce.number().int().min(1000).max(120000),
  maxOutputTokens: z.coerce.number().int().min(128).max(8192),
});

function readConfiguration() {
  return configurationSchema.safeParse({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    timeoutMs: process.env.OPENAI_TIMEOUT_MS ?? "30000",
    maxOutputTokens: process.env.OPENAI_MAX_OUTPUT_TOKENS ?? "2048",
  });
}

/** Server-only configuration status. Never return the key or raw validation errors. */
export function getCoachConfiguration() {
  const result = readConfiguration();
  if (!result.success) {
    const names = { apiKey: "OPENAI_API_KEY", model: "OPENAI_MODEL", timeoutMs: "OPENAI_TIMEOUT_MS", maxOutputTokens: "OPENAI_MAX_OUTPUT_TOKENS" };
    return { configured: false as const, invalidVariables: [...new Set(result.error.issues.map(issue => names[issue.path[0] as keyof typeof names]))] };
  }
  return { configured: true as const, model: result.data.model, timeoutMs: result.data.timeoutMs, maxOutputTokens: result.data.maxOutputTokens };
}

const requestSchema = z.object({
  // This value must be supplied by trusted server code, never by a browser form.
  instructions: z.string().trim().min(1).max(16000),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(12000) }).strict()).min(1).max(30),
}).strict().refine(value => value.messages.reduce((sum, message) => sum + message.content.length, value.instructions.length) <= 48000);

export type CoachRequest = z.infer<typeof requestSchema>;
export type CoachErrorCode = "not_configured" | "invalid_request" | "credentials" | "model_unavailable" | "quota_exceeded" | "rate_limited" | "timeout" | "connection" | "provider_unavailable" | "refused" | "incomplete" | "empty_response";
export type CoachUsage = { inputTokens: number; cachedInputTokens: number; outputTokens: number; totalTokens: number };
export type CoachResponse =
  | { ok: true; text: string; responseId: string; model: string; usage: CoachUsage | null }
  | { ok: false; code: CoachErrorCode; usage?: CoachUsage | null };

function errorCode(error: unknown): CoachErrorCode {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (error instanceof OpenAI.APIConnectionError) return "connection";
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) return "credentials";
    if (error.status === 404 || error.code === "model_not_found") return "model_unavailable";
    if (error.status === 429) return error.code === "insufficient_quota" ? "quota_exceeded" : "rate_limited";
    if (error.status === 400 || error.status === 422) return "invalid_request";
  }
  return "provider_unavailable";
}

/** Internal adapter only. Public callers must add verified auth, durable limits and accounting first. */
export async function requestCoachResponse(input: unknown): Promise<CoachResponse> {
  const configuration = readConfiguration();
  if (!configuration.success) return { ok: false, code: "not_configured" };
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_request" };
  const { apiKey, model, timeoutMs, maxOutputTokens } = configuration.data;
  const deadline = AbortSignal.timeout(timeoutMs);
  try {
    const client = new OpenAI({
      apiKey, baseURL: "https://api.openai.com/v1", timeout: timeoutMs,
      maxRetries: 0, logLevel: "off",
    });
    const response = await client.responses.create({
      model, instructions: parsed.data.instructions, input: parsed.data.messages,
      max_output_tokens: maxOutputTokens, store: false,
    }, { signal: deadline });
    const usage: CoachUsage | null = response.usage ? {
      inputTokens: response.usage.input_tokens,
      cachedInputTokens: response.usage.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.total_tokens,
    } : null;
    if (response.status === "incomplete") return { ok: false, code: "incomplete", usage };
    if (response.status !== "completed" || response.error) return { ok: false, code: "provider_unavailable", usage };
    if (response.output.some(item => item.type === "message" && item.content.some(content => content.type === "refusal"))) return { ok: false, code: "refused", usage };
    if (!response.output_text?.trim()) return { ok: false, code: "empty_response", usage };
    return { ok: true, text: response.output_text, responseId: response.id, model: response.model, usage };
  } catch (error) {
    // Never log provider errors: they may contain request bodies or credential fragments.
    if (deadline.aborted || (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))) return { ok: false, code: "timeout" };
    return { ok: false, code: errorCode(error) };
  }
}
