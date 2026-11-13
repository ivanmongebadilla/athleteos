# Phase 2 — Core training

Logging follow-up: [the session logging redesign](SESSION-LOGGING-REVIEW.md) adds independent block saves and append-only result corrections. Its migration `202611120003` brings the schema to 167 columns and supersedes the original single-submission logging limitation described below.

Implemented against the existing AthleteOS Supabase project `pffzbsoxdskrrkxjkodo` on November 12, 2026. No AI, recovery analytics or timers are included in this phase.

## Athlete workflow

1. **Today** shows sessions for the local date in the athlete's configured IANA time zone, with an onboarding prompt until settings are saved.
2. **Profile** edits name, units, experience, primary/secondary goals, limitations, equipment, disciplines, training days, session duration and time zone. Comma-separated entries become arrays. Saving updates profile/settings atomically and updates the displayed account name.
3. **Records** adds standard or custom movements, archives/restores exercises, and appends dated PRs with load, explicit unit, repetitions and notes. Existing PR entries remain immutable. Archived movements retain their references in previous plans and PRs. No invented profile or performance data is created.
4. **Calendar** offers Monday–Sunday month/week views, previous/next/today navigation and date-specific session creation. On phones, each day is displayed as a readable list. Draft and published plans are distinguished. Open a session and choose Edit session to reschedule it.
5. **Session editing** includes title/date/intensity/duration/notes, draft/published state, rest days, ordered workout sections, instructions, scoring format, time cap, movements, and prescribed sets with reps/load/unit/percentage/RPE/rest. Sections can be reordered; exercises/sets can be added or removed. An individual manual session has its own program/week container, keeping the normalized foundation schema intact.
6. **Logging** is available for published training sessions. Enter actual sets, reps, load, unit, RPE, rest, success and notes, plus section time/rounds/reps/scaling and RPE. Actual sets start empty. Scoring supports for-time, AMRAP, EMOM, intervals, Tabata and custom; interval details are written in section instructions. One atomic submission completes the session. Results retain the section's original scoring format and never replace prescribed loads or historical PRs. Completed sessions show the plan alongside immutable actual results.

English and Spanish are available throughout these workflows. User-entered exercise names, goals and instructions retain their original language. The Records navigation replaces the previous analytics placeholder; analytics remains Phase 4.

## Persistence and ownership

Migrations `202611120001_core_training.sql` and `202611120002_training_payload_guards.sql` add one column (`athlete_settings.onboarding_completed_at`) and authenticated RPCs `save_athlete_profile`, `save_training_session`, and `complete_training_session`. All 17 tables retain RLS; there are now 166 application columns. No extra credentials or service-role key are used.

RPCs derive identity from `auth.uid()`, use a fixed empty search path, verify ownership, preserve composite ownership foreign keys and execute atomically. Session updates lock the owned row and compare its version. Logging locks the same row, rejects drafts/duplicates/stale versions, validates section membership, and completes the session in the same transaction. Editing a completed plan is rejected. Direct writes around these transactions are revoked from API roles; internal helper functions are not executable by authenticated or anonymous clients. Missing arrays/results/versions are rejected at the database boundary as well as in Zod.

The RPC is a narrowly scoped privileged operation because replacing an unlogged prescription requires deleting its old child rows; ordinary clients retain no delete permission. The replacement transaction refuses any session with recorded results before deleting anything. PRs/results/completed sets remain append-only.

All migrations were applied via SQL Editor. Before adopting CLI migrations in this existing project, reconcile applied migration versions `202611110001`, `202611120001`, `202611120002`; do not push them again. New projects should apply all migrations in order.

## Verification

Final result: lint and strict TypeScript passed, production build passed, 23 unit tests passed, and 24 browser checks passed (4 training workflows, 12 foundation checks, 8 configured public checks). Hosted SQL transaction tests and schema verification passed with no retained fixtures. The final local preview uses `npm run dev` and real `.env.local` settings. Its fresh browser tab is signed out, so live private-screen review requires the athlete to sign in; authenticated browser workflow tests used the isolated fixture described below.

Evidence: [live Supabase verification](screenshots/supabase-phase2-verified.png), [desktop calendar with synthetic test data](screenshots/training-create-PR-structu-d622d-tual-loads-preserve-history-desktop-calendar-week.png), [mobile completed workout with synthetic test data](screenshots/training-create-PR-structu-d622d-tual-loads-preserve-history-iphone-session-completed.png).

- Lint, strict TypeScript, unit tests and production build.
- Calendar unit tests cover date validity, leap years, month boundaries, Monday week alignment, daylight-saving boundaries, and athlete-local dates. Input tests cover limits, rest-day structure, duplicates and empty actual results.
- Desktop and iPhone-sized Chromium workflow tests cover editable onboarding, Spanish persistence, custom exercise/PR creation, structured session creation, rescheduling, planned versus actual weights, completion freezing, calendar views, and unchanged PR history. These use the isolated local HTTP contract fixture in `tests/fixtures/training-server.mjs`, with synthetic auth cookies, no real keys, and no calls to hosted Supabase. They test UI/action integration; they do not prove real hosted authentication.
- Existing unconfigured and signed-out configured browser regressions cover auth redirects, public navigation and language persistence.
- `supabase/tests/core_training.sql` and `supabase/tests/isolation.sql` run against the actual hosted database under authenticated/anonymous roles. They test atomic rollback on bad references, cross-athlete read/write denial, rescheduling, draft rejection, duplicate/stale logging, planned/actual separation, immutable history and all six scoring formats. All temporary accounts and training rows roll back.
- `supabase/verify_core_training.sql` checks RLS, schema count, API/internal function boundaries and absence of temporary accounts.

Run the three browser suites sequentially with port 3000 free. They rebuild with fixture environment settings; rebuild with real `.env.local` afterward, then use `npm run dev` for the configured local preview.

## Practical limits and next gate

History intentionally has no destructive correction workflow yet. The library shows up to 1,000 exercises and the latest 1,000 PRs; the UI discloses this limit. Session drafts are manual, with no automatic programming or inferred PR updates. Percentage prescriptions retain the athlete-entered percentage without inventing a calculated load. A completed session is logged once; subsequent corrections require a future audited mechanism. Real hosted signup/email delivery and full Safari verification remain release checks. No deployment was performed.

Review the core training experience before Phase 3 contextual AI coaching, validated proposals, approval flows and durable usage limits.

## Calendar Today follow-up

Today now returns to the current date, preserves month/week mode, and scrolls to/focuses that date even on repeated clicks in the current period. Four desktop/mobile regression checks pass using `npx playwright test --config=playwright.calendar.config.ts`. This runs an isolated development server on port 3001 and synthetic data without a production build or changes to the main preview's connection.

During the current round of requested fixes and updates, defer production builds until the user says the changes are finished. Use development checks, lint and TypeScript checks meanwhile.
