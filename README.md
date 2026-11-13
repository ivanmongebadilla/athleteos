# AthleteOS

AthleteOS now includes Phase 2: editable athlete onboarding, an exercise library, historical PRs, month/week scheduling, structured manual sessions, workout logging and a Progress overview built from saved training data. Supabase provides authentication, persistent data and ownership isolation. AI coaching follows in Phase 3; advanced analytics and timers follow in Phase 4.

See the [Phase 2 implementation and verification report](docs/PHASE-2-REVIEW.md) for workflows and database changes.

The [session creator](docs/SESSION-CREATOR-REVIEW.md) supports independent, collapsible workout blocks. The [session logging page](docs/SESSION-LOGGING-REVIEW.md) saves each block separately, adapts WOD scores to their format, and preserves earlier results when corrected.

See [architecture, schema decisions, acceptance criteria and phased plan](docs/IMPLEMENTATION.md).

For an existing empty Supabase project, see the [complete table and column reference with SQL Editor setup instructions](docs/SUPABASE-SCHEMA.md).

## Run locally

Use Node.js 22.16+ and npm.

```powershell
npm install
Copy-Item .env.example .env.local
# Edit .env.local with your Supabase project's URL and publishable key.
npm run dev
```

Open http://127.0.0.1:3000 for the public presentation page. Login and the public page have their own header/footer without the training sidebar or athlete avatar. Protected training routes require a verified user; without valid environment values, they redirect to the developer setup fallback. A publishable key is intentionally public; authorization comes from verified user JWTs and RLS. Never add a service-role key to this app.

Use the **English / Español** selector to change language. The choice persists for one year and applies to public pages, training forms, navigation and feedback. Typed dictionaries live in `src/lib/i18n/messages.ts` and `src/modules/training/messages.ts`. User-entered content retains its original language. The landing page distinguishes available manual training features from the AI roadmap.

The project `.npmrc` enables Node's system certificate store for npm scripts, so local Supabase requests honor the trusted Windows certificates while retaining TLS verification. If installing dependencies also encounters a certificate-chain error, run `$env:NODE_OPTIONS='--use-system-ca'` in PowerShell before `npm install`.

Required variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your local or hosted Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (legacy anon key also works) |

There is no OpenAI runtime dependency or required AI key in Phase 1. Future `OPENAI_API_KEY` and model settings must remain server-only.

## Database and authentication

Install the Supabase CLI using the official supported method and start Docker Desktop for local development. From this directory:

```powershell
supabase start
supabase db reset
supabase status
```

`db reset` destroys data in the local development database. Use it only for a disposable local instance. Copy the displayed local API URL and publishable/anon key into `.env.local`. The local database is on port 54322, Studio on 54323, and the test email inbox on 54324.

For a new hosted project, link with `supabase link --project-ref YOUR_PROJECT_REF`, inspect the migrations, then run `supabase db push`. The existing AthleteOS hosted project has all eleven migrations applied through SQL Editor. Before first using CLI migration management there, reconcile versions `202611110001`, `202611120001`, `202611120002`, `202611120003`, `202611120004`, `202611120005`, `202611120006`, `202611120007`, `202611130001`, `202611140001`, and `202611140002` with `supabase migration repair --status applied VERSION`; do not reapply them.

Configure Supabase Auth:

1. Enable email/password sign-in, email confirmation and a minimum password length of 12.
2. Set Site URL to `http://127.0.0.1:3000` locally (your canonical HTTPS origin in production). Add `/auth/confirm` on that origin to allowed redirects if using the optional custom-template flow.
3. The default confirmation email template works without editing: Supabase redirects to Site URL with a PKCE `code`; the root page forwards it to `/auth/callback`, which exchanges it for a cookie session. Open the confirmation link in the same browser used for signup. If it opens elsewhere, the email may still be confirmed; return to the app and sign in with your password. With custom SMTP, you can alternatively set the email link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` to use the existing token-hash handler.
4. Configure production SMTP, provider rate limits and CAPTCHA/bot protection before exposing public signup. Default development email delivery is not a production mail service.
5. Create an account in the app, confirm your email, and sign in. Signup creates safe profile/settings defaults. Complete Profile, add movements and historical PRs under Records, then create, publish and log sessions from Calendar.

The auth layout and profile read verify identity server-side. Proxy refreshes auth cookies; it is not the only authorization boundary. Browser requests never supply an authoritative athlete ID. Supabase errors are mapped to generic UI messages and credentials are never logged.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:e2e:configured
npx playwright test --config=playwright.training.config.ts
```

Playwright builds and launches its own unconfigured production server on port 3000, with desktop and iPhone-sized Chromium projects. Keep that port free. These tests verify setup/auth boundaries and responsive layout; they do not prove Safari compatibility or live Supabase authentication. Because public environment settings are embedded at build time, rebuild with `npm run build` before starting your configured production preview after these tests.

`test:e2e:configured` separately builds with fixture configuration to verify public navigation, the absence of signed-out sidebars/avatars, the setup redirect, landing calls to action, and English/Spanish persistence through reloads and auth errors. It uses no real project keys or athlete data. Run the two browser suites sequentially because they share port 3000 and the build directory. Setup instructions remain available only when configuration is missing. The original generated hero asset and its prompt are documented in `docs/HERO-ASSET.md`.

After applying the migration to a disposable database, run:

```powershell
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/isolation.sql
```

The transactional SQL check creates two temporary users and verifies profile/settings isolation, cross-user write denial, composite parent ownership, history immutability, restricted AI-log writes, and anonymous denial. All fixtures roll back. Auth signup/confirmation/logout, token refresh, expired tokens and a second account must also be checked against a configured instance before release.

## Database boundaries

All 17 public tables enable RLS. Athlete-owned relationships use composite foreign keys containing `athlete_id`. Shared/private exercise references use UUID foreign keys plus ownership validation triggers. Every table has UUID keys, timestamps, ownership indexes and scoped reads. Ordinary clients cannot delete rows; PR/results/completed sets/check-ins are append-only. Workout result corrections append an audited section revision; PR corrections remain a future workflow. AI tables are read-only to clients until narrowly scoped server operations are implemented. No storage buckets are needed yet.

Profile/settings edits and session/logging writes use authenticated transactional RPCs. Completed prescriptions and results are immutable to application roles. No sample PRs or athlete profile are seeded automatically; enter real historical records using the editable forms.

## Vercel

Import this directory as a Next.js project, use Node 22, configure the two public Supabase variables for the intended environment and apply the reviewed migration to that environment. Set the canonical HTTPS Auth URL before testing signup; the default confirmation template is supported. Deploy with `npm run build` / Vercel's Next.js defaults. Public variables are embedded at build time, so rebuild after changing them. Do not use production athlete data in preview deployments. No deployment is performed automatically.

## Next approval gate

Review Phase 2 before implementing Phase 3 AI coaching. See the full acceptance gates and technical risks in `docs/IMPLEMENTATION.md`.

Primary implementation references: [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).


Shared exercise catalog: see [catalog coverage, provenance and verification](docs/EXERCISE-CATALOG-REVIEW.md). The catalog includes 1,379 exercises with English/Spanish names and instructions; custom exercises and athlete records remain private.

Session deletion: see [confirmation, Undo and history-preservation details](docs/SESSION-DELETION-REVIEW.md).

WOD scoring: see [format-specific creation, logging and migration notes](docs/WOD-SCORING-REVIEW.md).
