# AthleteOS implementation contract

## Scope and architecture

Phase 1 is the foundation only. Phase 2 requires explicit approval. This is a modular monolith: Next.js App Router + strict TypeScript + React + Tailwind, deployed to Vercel; Supabase provides PostgreSQL and cookie-based Auth. Server Components read authenticated data, Server Actions validate mutations with Zod, and PostgreSQL RLS independently enforces ownership. No service-role key is used by the web application. No athlete ID from a browser is trusted.

Future module boundaries: identity, exercise library/records, programming, logging, recovery, analytics, timers, and coach. Domain calculations live in pure TypeScript, outside UI and AI adapters. Coach requests run server-side through the Responses API with structured outputs and allowlisted tools; tools derive identity from verified auth. Generated content is validated, stored as a proposal/draft, and explicitly approved before publishing. No AI endpoint is included in Phase 1.

## Data model

The initial migration includes profiles and athlete_settings (one per auth user); exercises; append-only personal_records; training_programs → training_weeks → training_sessions → workout_sections → prescribed_exercises → prescribed_sets; workout_results → completed_sets; recovery_checkins; ai_conversations → ai_messages; ai_proposals; ai_usage_logs. All records use UUIDs and timestamps. Child rows carry athlete_id and composite foreign keys to prevent cross-athlete relationships even when a parent UUID is known. Auth ownership is immutable under RLS. Planned prescriptions and actual results are separate. Optional seed records are never created on signup.

Training dates are local calendar dates; instants are timestamptz. Loads are stored with explicit units; future analytics must normalize before aggregation. Programs have draft/published/archived states. Sets retain repetitions, load, RPE, rest, and attempt success. WOD results retain structured scoring fields. Personal-record and completed-performance history cannot be deleted or edited by ordinary clients. Account deletion is an explicit future retention/export workflow.

## Phases and acceptance criteria

1. **Foundation (this delivery):** app builds without credentials; unconfigured routes show an honest setup state; responsive five-item navigation and light/dark themes; email/password signup, login, email confirmation and logout when configured; verified server auth protects athlete pages; signup creates isolated profile/settings; migration enables RLS on every public table, checks valid values and ownership through composite keys; documented setup and reproducible unit/E2E/security checks.
2. **Core training:** editable athlete onboarding and settings, custom exercises and historical PRs, month/week calendar and rescheduling, structured session editing, separate planned/actual logging across supported formats. Acceptance: two users cannot read or modify each other's data; logging preserves prescriptions and PR history.
3. **AI:** contextual chat and tools, sessions/four-week mesocycles, deterministic load/volume/recovery validation, approval workflow, durable rate limits, usage/cost accounting. Acceptance: malformed or unsafe proposals are rejected, AI cannot publish/write arbitrary SQL, limits and ownership are enforced server-side. Model and pricing configuration remains server-only.
4. **Analytics/timers:** timestamp-based persisted stopwatch/countdown/AMRAP/EMOM/intervals, recovery history, deterministic volume/frequency/RPE/benchmark trends. Acceptance: suspension/resume and unit conversions are tested; significant pain prevents automatic intense prescriptions; no injury diagnosis claims.
5. **Release:** integration/E2E isolation checks, accessibility and iPhone Safari checks, performance/security review and Vercel release. Acceptance: configured production authentication and email delivery tested, all required CI checks pass, backup/restore and monitoring documented.

## Risks and decisions

- Supabase credentials, a running PostgreSQL instance and email delivery are external prerequisites. Without them, live auth/RLS behavior cannot be claimed verified.
- Email signup requires confirmation by default. Configure the confirmation template and redirect allowlist; never trust user-supplied redirect URLs.
- Supabase Auth rate limits must be configured at the provider. Durable AI rate limits and a spend budget are required before adding AI endpoints; process-memory counters are insufficient on Vercel.
- RLS alone does not enforce programming safety or approval semantics. Phase 3 must use transactional publish functions that revalidate drafts and require authenticated approval.
- Ordinary clients cannot mutate usage logs or proposals in this foundation. Future trusted server operations need narrowly scoped SQL functions, never unrestricted model writes.
- Mobile browsers may suspend timers/audio; timestamp reconciliation works after resume but cannot promise background alarms.
- Health/recovery information is sensitive: avoid logging payloads, define retention/export before launch, and do not diagnose injuries.
- Initial normalized schema is intentionally broader than the Phase 1 UI; later behavior must arrive through reviewed migrations and tests.

## Validation gates

Run lint, strict type checking, unit tests, a production build, and Playwright for the unconfigured experience. Run the supplied SQL isolation test after resetting a disposable local Supabase database. Configured auth and production deployment remain manual integration gates until external services are available.
