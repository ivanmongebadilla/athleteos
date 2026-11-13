Phase 3, point 1: server-side OpenAI integration foundation.

Implementation lives in `src/modules/coach/openai.ts`. It is guarded by `server-only`, uses the official OpenAI JavaScript SDK and Responses API, validates configuration and input with Zod, and makes no calls during import or normal app startup. Model selection is explicit: there is no hardcoded model or silent fallback. Missing AI configuration leaves existing training features usable.

Set these values in ignored `.env.local` (and server environment settings when deploying):

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Secret API project key, never `NEXT_PUBLIC_` |
| `OPENAI_MODEL` | Responses-compatible model ID available to that API project |
| `OPENAI_TIMEOUT_MS` | Default 30000; allowed 1000–120000 milliseconds |
| `OPENAI_MAX_OUTPUT_TOKENS` | Default 2048; allowed 128–8192 output tokens |

The model must support text input/output through Responses. Do not assume that a model available in a ChatGPT subscription is enabled in the API project. No pricing or model availability is hardcoded. Restart the development server after changing environment configuration.

Run `npm run coach:check` to validate local configuration. It prints variable names or safe configuration metadata, never the secret, and sends no request. Run `npm run coach:check:live` to send one fixed synthetic connection test with the configured model and output limit. The live check incurs API usage; it does not read Supabase or transmit athlete data. Node 22.16+ runs the TypeScript module using native type stripping; `react-server` conditions permit the intentionally server-only module in this local CLI. This flag belongs only to the diagnostic script, never client code or the Next.js dev command.

The adapter sets the API destination explicitly, disables SDK debug logging and automatic retries, sets a request timeout plus abort deadline, caps input/output, requests `store: false`, and returns normalized token usage. `store: false` disables response storage for API retrieval; it is not a promise of zero retention across all provider systems. Errors return stable categories for invalid configuration/input, credentials, model availability, quota, rate limits, timeouts, network failures, provider failures, refusal, incomplete output and empty output. Raw provider errors, prompts, secrets and response bodies are not logged.

This is an internal adapter, with no browser-accessible endpoint or Server Action. Chat UI, athlete context retrieval, persistent conversations, durable per-user limits, cost accounting and database migrations belong to the next integration steps. Before exposing the adapter, authenticated server code must enforce those controls and supply trusted coaching instructions itself; it must never forward a browser-supplied developer prompt. No database changes are required for point 1.

Tests use the real SDK with mocked HTTP transport, covering request boundaries, secret-safe configuration, fixed destination, stateless payload, token usage, errors, no retries, deadline cancellation and unusable output. No unit test uses a real key or incurs API charges. Live verification must be reported separately from these tests.

References: [official OpenAI quickstart](https://developers.openai.com/api/docs/quickstart), [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [error guidance](https://developers.openai.com/api/docs/guides/error-codes), and the bundled Next.js environment-variable guide.

Verification: all 57 unit tests passed (18 OpenAI adapter cases plus 39 existing tests). Lint and TypeScript passed. The CLI was checked with missing real configuration and with synthetic valid settings; neither path sent an API request. Live verification succeeded on 2026-11-13 with the configured model gpt-6.1-sol: the fixed synthetic test returned the expected marker, using 31 input tokens and 8 output tokens. No athlete data was read or sent. A dedicated coach:check:live command avoids npm argument-forwarding differences in PowerShell. No production build or hosted database change was performed.
