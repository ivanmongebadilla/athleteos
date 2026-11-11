# AthleteOS

Phase 1 of a personal CrossFit and weightlifting coach. This delivery includes the application foundation, real Supabase authentication, a normalized database migration and the responsive shell. Training, PR editing, AI, logging and analytics deliberately await later phases and approval.

See [architecture, schema decisions, acceptance criteria and phased plan](docs/IMPLEMENTATION.md).

## Run locally

Use Node.js 22.16+ and npm.

```powershell
npm install
Copy-Item .env.example .env.local
# Edit .env.local with your Supabase project's URL and publishable key.
npm run dev
```

Open http://127.0.0.1:3000. Without valid environment values, the app displays the setup page and protects all athlete routes. This is a setup state, not a mock authenticated session. A publishable key is intentionally public; authorization comes from verified user JWTs and RLS. Never add a service-role key to this app.

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

For a hosted project, link with `supabase link --project-ref YOUR_PROJECT_REF`, inspect the migration, then run `supabase db push`. No migration has been applied to a hosted service by this delivery.

Configure Supabase Auth:

1. Enable email/password sign-in, email confirmation and a minimum password length of 12.
2. Set Site URL to `http://127.0.0.1:3000` locally (your canonical HTTPS origin in production). Add `/auth/confirm` on that origin to allowed redirects.
3. Set the Confirm signup email link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
4. Configure production SMTP, provider rate limits and CAPTCHA/bot protection before exposing public signup. Default development email delivery is not a production mail service.
5. Create an account in the app, open the confirmation email, confirm, and sign in. Signup triggers create the profile and settings using safe defaults. The Profile page reads only the verified user's row and supports sign-out.

The auth layout and profile read verify identity server-side. Proxy refreshes auth cookies; it is not the only authorization boundary. Browser requests never supply an authoritative athlete ID. Supabase errors are mapped to generic UI messages and credentials are never logged.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright launches its own unconfigured development server on port 3000, with desktop and iPhone-sized Chromium projects. Keep that port free. These tests verify setup/auth boundaries and responsive layout; they do not prove Safari compatibility or live Supabase authentication.

After applying the migration to a disposable database, run:

```powershell
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/isolation.sql
```

The transactional SQL check creates two temporary users and verifies profile/settings isolation, cross-user write denial, composite parent ownership, history immutability, restricted AI-log writes, and anonymous denial. All fixtures roll back. Auth signup/confirmation/logout, token refresh, expired tokens and a second account must also be checked against a configured instance before release.

## Database boundaries

All 17 public tables enable RLS. Athlete-owned relationships use composite foreign keys containing `athlete_id`. Every table has UUID keys, timestamps, ownership indexes and scoped reads. Ordinary clients cannot delete rows; PR/results/completed sets/check-ins are append-only. Future corrections need an audited correction mechanism. AI tables are read-only to clients until narrowly scoped server operations are implemented. No storage buckets are needed yet.

Profile fields and settings for later onboarding already exist in the schema. The optional seed profile and PR values from the brief belong to Phase 2 alongside editable records; signup does not silently populate an athlete with fictional performance data.

## Vercel

Import this directory as a Next.js project, use Node 22, configure the two public Supabase variables for the intended environment and apply the reviewed migration to that environment. Set the canonical HTTPS Auth URL and confirmation template before testing signup. Deploy with `npm run build` / Vercel's Next.js defaults. Public variables are embedded at build time, so rebuild after changing them. Do not use production athlete data in preview deployments. No deployment is performed automatically.

## Next approval gate

Review Phase 1 before Phase 2. The next increment is editable onboarding, an exercise library and historical personal records, followed by calendar/session creation and logging. See the full acceptance gates and technical risks in `docs/IMPLEMENTATION.md`.

Primary implementation references: [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
