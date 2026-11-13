# Phase 1 review — November 11, 2026

## Delivered

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4 and a reproducible npm lockfile.
- Responsive workspace shell with Today, Calendar, Coach AI, Progress and Profile navigation, persistent light/dark themes, skip link and mobile bottom navigation.
- Honest setup screen when environment configuration is absent; protected athlete routes do not grant access in that state.
- Supabase SSR cookie refresh, server-verified identity, validated signup/login actions, email confirmation and sign-out. Profile/settings rows are created by the database signup trigger.
- Normalized migration for 17 tables, RLS on every table, scoped privileges, composite ownership foreign keys, constraints, indexes and append-only performance history.
- Architecture, initial schema design, acceptance criteria, phase boundaries, technical risks, local setup and Vercel instructions.
- Vitest, Playwright, transactional SQL isolation checks and a GitHub Actions workflow.

## Executed checks

| Check | Result |
| --- | --- |
| ESLint | Passed, no findings |
| Strict TypeScript / route type generation | Passed |
| Vitest | 3 tests passed |
| Next.js production build | Passed |
| Playwright Chromium | 8 tests passed across desktop and iPhone-sized viewports |
| Visual review | Desktop light and mobile dark screenshots inspected; no horizontal overflow |
| npm dependency audit | 0 vulnerabilities reported after tooling updates |

The scoped `minimatch` override patches a transitive TypeScript ESLint advisory. ESLint 9 remains within the bundled Next.js plugins' supported peer range; npm marks that ESLint line deprecated. Reassess the lint stack when those plugins declare ESLint 10 support. Vitest uses the patched 5.x line. Dependency installation required Node's `--use-system-ca` option on this Windows environment; TLS verification stayed enabled.

## External integration gates still open

No Supabase credentials were provided. The Supabase CLI and psql were not available, and Docker had no reachable engine. Consequently the migration and `supabase/tests/isolation.sql` have **not** been executed against PostgreSQL; live signup, email confirmation, token refresh, two-account isolation and logout have **not** been verified against Supabase. Apply the migration to a disposable local or staging project and complete those checks before treating authentication as release-validated. iPhone viewport testing used Chromium, not physical iPhone Safari. CI is supplied but has not run on GitHub. No deployment was performed.

## Supabase connection follow-up

The athlete subsequently supplied the existing project URL/key. Connection settings are saved in ignored `.env.local`. Read-only verification against project `pffzbsoxdskrrkxjkodo` returned HTTP 200 from Auth settings: email authentication and signup are enabled, with email confirmation required. The initial `profiles` query returned HTTP 404 before applying the migration.

After the athlete signed in to the Supabase dashboard, the preflight confirmed zero public tables and zero Auth users. The migration was applied successfully through SQL Editor. The transactional two-user isolation script then completed without error and rolled back its fixtures. Read-only verification returned **17 application tables, 165 columns, RLS enabled on all 17 tables, one signup trigger and zero remaining test accounts**. Proof is saved in `docs/screenshots/supabase-foundation-verified.png`. SQL Editor deployment bypasses CLI migration history; reconcile version `202611110001` before a future CLI push, as documented in the schema reference.

The Auth Site URL is now `http://127.0.0.1:3000`, matching the local app, with `/auth/confirm` allowed for the optional custom-template flow. The dashboard requires custom SMTP to edit email templates, so the app now also supports the default PKCE confirmation link through its root landing and `/auth/callback`. The configured preview was checked in the browser: setup reflects the environment and signed-out athlete navigation redirects to an enabled login form. Personal account creation, actual email delivery, confirmed login and logout still require the athlete's signup; no permanent user account was created by the agent. Phase 2 remains unimplemented.

The full 17-table, 165-column reference is in `docs/SUPABASE-SCHEMA.md`.

Follow-up validation: lint, strict TypeScript and all 3 unit tests passed. All **12** browser checks passed against the production build with one browser worker, covering both default-template and optional token-hash confirmation failure boundaries. Earlier concurrent runs stalled on asset loads, and a broad alert locator also matched Next.js's route announcer; the suite now uses a single worker and scopes assertions to the actual error message. The configured production preview is rebuilt after the isolated tests.

## Setup navigation cleanup — November 12, 2026

The connected shell no longer displays the developer setup card/link. Login uses the labels “Sign in” and “Sign in to your account” instead of “Getting started” and “Setup required.” A configured `/setup` request redirects to `/today`, whose existing authentication check sends signed-out athletes to `/login`. Missing configuration still shows the setup fallback and instructions.

Validation passed: lint, strict TypeScript, 3 unit tests, 12 existing unconfigured desktop/mobile browser checks and 4 additional configured-state browser checks. The configured checks use fixture settings without real keys or athlete data. No database or authentication policies were changed.

## Approval boundary

Phase 2 has not been implemented. After review and explicit approval, begin with editable athlete onboarding, the exercise library and historical PR management, then structured sessions/calendar/logging. AI endpoints, coaching decisions, timers and analytics remain in their planned phases.
