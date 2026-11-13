# AthleteOS — Supabase tables and columns

This is the exact initial schema from `supabase/migrations/202611110001_foundation.sql`. It contains **17 application tables** in the `public` schema. Supabase supplies `auth.users`; do not create that table manually.

## Create the tables in your existing project

The migration creates the tables, all columns below, foreign keys, indexes, validation checks, row-level security policies and the signup trigger in one transaction. Creating tables alone through Table Editor would omit these essential rules.

1. Open your existing Supabase project and open **SQL Editor → New query**.
2. Open `supabase/migrations/202611110001_foundation.sql` from this repository, copy its entire contents, paste into the query and run it once.
3. Check that all 17 tables appear in the `public` schema. The migration is intended for an empty application schema; it is not a repeatable seed script.
4. Copy the project URL and publishable key from the project's Connect dialog/API settings into `.env.local`, using the variable names below.
5. Restart/rebuild AthleteOS, configure the Auth Site URL described in the README, then test account creation and sign-in. The default confirmation email template is supported; custom SMTP is optional for local development.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The public URL/key connect the app to Supabase; they do **not** grant permission to create tables. Applying the migration requires your signed-in Supabase SQL Editor or an authenticated Supabase CLI session. No service-role key is needed in the application.

If you use SQL Editor, retain this migration in source control. Before later switching to CLI deployment, reconcile migration history for this version (`202611110001`) with `supabase migration repair --status applied 202611110001` on the linked project after verifying the SQL was successfully applied; otherwise the CLI may try to recreate existing tables.

## Reading the schema

Connection follow-up: this migration has now been applied to the existing AthleteOS project `pffzbsoxdskrrkxjkodo`. Verification returned 17 tables, 165 columns, RLS enabled on all 17 tables and an installed signup trigger. The transactional two-user isolation check passed and left zero temporary test accounts. Do not run the initial migration again on that project. The read-only checks are in `supabase/verify_foundation.sql`.

- `uuid`: an identifier. Every table has a UUID primary key.
- `text[]`: a list of text values.
- `date`: a local calendar date; `timestamptz`: a timestamp with timezone.
- `numeric(p,s)`: exact decimal numbers; `jsonb`: structured JSON.
- “Required” means SQL `NOT NULL` or primary key. A default can supply a required value when the caller omits it.
- Every table has `created_at` and `updated_at`; an update trigger maintains `updated_at`.
- Every table except `profiles` has `athlete_id` referencing `profiles.id`. RLS permits scoped reads only for the signed-in athlete. Parent links include that athlete ID so rows cannot link to another athlete's data.
- Foreign keys do not cascade deletion. Ordinary application clients have no delete privileges.
- All AI tables are currently read-only to application clients. Later phases will add constrained server write operations.

## Table summary

| Table | What it stores |
| --- | --- |
| `profiles` | Athlete identity, goals, experience, units and limitations. Linked to Supabase Auth. |
| `athlete_settings` | Schedule, equipment, disciplines and timezone. |
| `exercises` | Each athlete’s exercise library, including custom movements. |
| `personal_records` | Historical PR attempts; new records are appended rather than overwriting previous ones. |
| `training_programs` | Mesocycles/programs and draft/published/archived state. |
| `training_weeks` | Weeks within a program, including deload flags. |
| `training_sessions` | Calendar dates, session status and intensity. |
| `workout_sections` | Ordered warm-up, lifting, strength, gymnastics, conditioning, accessories and cooldown sections. |
| `prescribed_exercises` | Ordered planned movements within a workout section. |
| `prescribed_sets` | Planned repetitions, loads, percentages, RPE and rest. |
| `workout_results` | Actual session/section scores and completion data, separate from the plan. |
| `completed_sets` | Actual repetitions, load, RPE, rest and successful/failed attempts. |
| `recovery_checkins` | Historical sleep, fatigue, soreness, pain and readiness reports. |
| `ai_conversations` | Coach conversation containers. |
| `ai_messages` | Messages belonging to a coach conversation. |
| `ai_proposals` | Structured draft workout/program/adjustment proposals and approval state. |
| `ai_usage_logs` | Model request usage and estimated cost. |

## profiles

Athlete identity, goals, experience, units and limitations. Linked to Supabase Auth.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key references auth.users(id) on delete restrict` |
| `name` | `text` | Yes | `not null default '' check (length(name) <= 120)` |
| `preferred_units` | `text` | Yes | `not null default 'lb' check (preferred_units in ('lb','kg'))` |
| `experience` | `text` | Yes | `not null default 'beginner' check (experience in ('beginner','intermediate','advanced'))` |
| `primary_goals` | `text[]` | Yes | `not null default '{}'` |
| `secondary_goals` | `text[]` | Yes | `not null default '{}'` |
| `limitations` | `text[]` | Yes | `not null default '{}'` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

## athlete_settings

Schedule, equipment, disciplines and timezone.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `training_days_per_week` | `integer` | Yes | `not null default 5 check (training_days_per_week between 1 and 7)` |
| `available_minutes` | `integer` | Yes | `not null default 60 check (available_minutes between 10 and 300)` |
| `timezone` | `text` | Yes | `not null default 'UTC'` |
| `equipment` | `text[]` | Yes | `not null default '{}'` |
| `disciplines` | `text[]` | Yes | `not null default '{}'` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (athlete_id)
unique (id, athlete_id)
```

## exercises

Each athlete’s exercise library, including custom movements.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `name` | `text` | Yes | `not null check (length(name) between 1 and 120)` |
| `discipline` | `text` | Yes | `not null check (discipline in ('weightlifting','strength','gymnastics','conditioning','accessory','custom'))` |
| `archived` | `boolean` | Yes | `not null default false` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (athlete_id, name)
unique (id, athlete_id)
```

## personal_records

Historical PR attempts; new records are appended rather than overwriting previous ones.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `exercise_id` | `uuid` | Yes | `not null` |
| `recorded_on` | `date` | Yes | `not null` |
| `load` | `numeric(8,2)` | Yes | `not null check (load > 0)` |
| `unit` | `text` | Yes | `not null check (unit in ('lb','kg'))` |
| `repetitions` | `integer` | Yes | `not null default 1 check (repetitions between 1 and 1000)` |
| `notes` | `text` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
foreign key (exercise_id, athlete_id) references public.exercises(id, athlete_id)
unique (id, athlete_id)
```

## training_programs

Mesocycles/programs and draft/published/archived state.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `name` | `text` | Yes | `not null check (length(name) between 1 and 160)` |
| `status` | `text` | Yes | `not null default 'draft' check (status in ('draft','published','archived'))` |
| `starts_on` | `date` | Yes | `not null` |
| `ends_on` | `date` | Yes | `not null check (ends_on >= starts_on)` |
| `goals` | `text[]` | Yes | `not null default '{}'` |
| `source` | `text` | Yes | `not null default 'manual' check (source in ('manual','ai'))` |
| `approved_at` | `timestamptz` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (id, athlete_id)
```

## training_weeks

Weeks within a program, including deload flags.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `program_id` | `uuid` | Yes | `not null` |
| `week_number` | `integer` | Yes | `not null check (week_number > 0)` |
| `deload` | `boolean` | Yes | `not null default false` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (program_id, week_number)
foreign key (program_id, athlete_id) references public.training_programs(id, athlete_id)
unique (id, athlete_id)
```

## training_sessions

Calendar dates, session status and intensity.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `week_id` | `uuid` | Yes | `not null` |
| `title` | `text` | Yes | `not null check (length(title) between 1 and 160)` |
| `scheduled_on` | `date` | Yes | `not null` |
| `status` | `text` | Yes | `not null default 'scheduled' check (status in ('scheduled','completed','rest','cancelled'))` |
| `intensity` | `text` | Yes | `not null default 'moderate' check (intensity in ('low','moderate','high'))` |
| `duration_minutes` | `integer` | No | `check (duration_minutes between 1 and 600)` |
| `notes` | `text` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
foreign key (week_id, athlete_id) references public.training_weeks(id, athlete_id)
unique (id, athlete_id)
```

## workout_sections

Ordered warm-up, lifting, strength, gymnastics, conditioning, accessories and cooldown sections.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `session_id` | `uuid` | Yes | `not null` |
| `position` | `integer` | Yes | `not null check (position >= 0)` |
| `kind` | `text` | Yes | `not null check (kind in ('warmup','weightlifting','strength','gymnastics','conditioning','accessories','cooldown'))` |
| `format` | `text` | No | `check (format in ('for_time','amrap','emom','intervals','tabata','custom'))` |
| `time_cap_seconds` | `integer` | No | `check (time_cap_seconds > 0)` |
| `instructions` | `text` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (session_id, position)
foreign key (session_id, athlete_id) references public.training_sessions(id, athlete_id)
unique (id, athlete_id)
unique (id, session_id, athlete_id)
```

## prescribed_exercises

Ordered planned movements within a workout section.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `section_id` | `uuid` | Yes | `not null` |
| `exercise_id` | `uuid` | Yes | `not null` |
| `position` | `integer` | Yes | `not null check (position >= 0)` |
| `notes` | `text` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (section_id, position)
foreign key (section_id, athlete_id) references public.workout_sections(id, athlete_id)
foreign key (exercise_id, athlete_id) references public.exercises(id, athlete_id)
unique (id, athlete_id)
```

## prescribed_sets

Planned repetitions, loads, percentages, RPE and rest.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `prescribed_exercise_id` | `uuid` | Yes | `not null` |
| `set_number` | `integer` | Yes | `not null check (set_number > 0)` |
| `repetitions` | `integer` | Yes | `not null check (repetitions between 1 and 1000)` |
| `load` | `numeric(8,2)` | No | `check (load >= 0)` |
| `unit` | `text` | No | `check (unit in ('lb','kg'))` |
| `percentage` | `numeric(5,2)` | No | `check (percentage > 0 and percentage <= 110)` |
| `target_rpe` | `numeric(3,1)` | No | `check (target_rpe between 1 and 10)` |
| `rest_seconds` | `integer` | No | `check (rest_seconds >= 0)` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
check ((load is null) = (unit is null))
unique (prescribed_exercise_id, set_number)
foreign key (prescribed_exercise_id, athlete_id) references public.prescribed_exercises(id, athlete_id)
unique (id, athlete_id)
```

## workout_results

Actual session/section scores and completion data, separate from the plan.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `session_id` | `uuid` | Yes | `not null` |
| `section_id` | `uuid` | No | — |
| `completed_at` | `timestamptz` | Yes | `not null default now()` |
| `format` | `text` | No | `check (format in ('for_time','amrap','emom','intervals','tabata','custom'))` |
| `completion_seconds` | `integer` | No | `check (completion_seconds >= 0)` |
| `rounds` | `integer` | No | `check (rounds >= 0)` |
| `repetitions` | `integer` | No | `check (repetitions >= 0)` |
| `scaled` | `boolean` | Yes | `not null default false` |
| `session_rpe` | `numeric(3,1)` | No | `check (session_rpe between 1 and 10)` |
| `notes` | `text` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
foreign key (session_id, athlete_id) references public.training_sessions(id, athlete_id)
foreign key (section_id, session_id, athlete_id) references public.workout_sections(id, session_id, athlete_id)
unique (id, athlete_id)
```

## completed_sets

Actual repetitions, load, RPE, rest and successful/failed attempts.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `result_id` | `uuid` | Yes | `not null` |
| `exercise_id` | `uuid` | Yes | `not null` |
| `set_number` | `integer` | Yes | `not null check (set_number > 0)` |
| `repetitions` | `integer` | Yes | `not null check (repetitions between 0 and 1000)` |
| `load` | `numeric(8,2)` | Yes | `not null check (load >= 0)` |
| `unit` | `text` | Yes | `not null check (unit in ('lb','kg'))` |
| `rpe` | `numeric(3,1)` | No | `check (rpe between 1 and 10)` |
| `successful` | `boolean` | Yes | `not null default true` |
| `rest_seconds` | `integer` | No | `check (rest_seconds >= 0)` |
| `notes` | `text` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (result_id, exercise_id, set_number)
foreign key (result_id, athlete_id) references public.workout_results(id, athlete_id)
foreign key (exercise_id, athlete_id) references public.exercises(id, athlete_id)
unique (id, athlete_id)
```

## recovery_checkins

Historical sleep, fatigue, soreness, pain and readiness reports.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `checked_on` | `date` | Yes | `not null` |
| `sleep_hours` | `numeric(3,1)` | Yes | `not null check (sleep_hours between 0 and 24)` |
| `fatigue` | `integer` | Yes | `not null check (fatigue between 1 and 10)` |
| `soreness` | `integer` | Yes | `not null check (soreness between 1 and 10)` |
| `pain` | `integer` | Yes | `not null check (pain between 0 and 10)` |
| `readiness` | `integer` | Yes | `not null check (readiness between 1 and 10)` |
| `notes` | `text` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (id, athlete_id)
```

## ai_conversations

Coach conversation containers.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `title` | `text` | Yes | `not null default 'Coach conversation'` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
unique (id, athlete_id)
```

## ai_messages

Messages belonging to a coach conversation.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `conversation_id` | `uuid` | Yes | `not null` |
| `role` | `text` | Yes | `not null check (role in ('user','assistant','tool'))` |
| `content` | `text` | Yes | `not null` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
foreign key (conversation_id, athlete_id) references public.ai_conversations(id, athlete_id)
unique (id, athlete_id)
```

## ai_proposals

Structured draft workout/program/adjustment proposals and approval state.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `conversation_id` | `uuid` | No | — |
| `kind` | `text` | Yes | `not null check (kind in ('session','mesocycle','adjustment'))` |
| `status` | `text` | Yes | `not null default 'draft' check (status in ('draft','validated','approved','rejected'))` |
| `payload` | `jsonb` | Yes | `not null check (jsonb_typeof(payload) = 'object')` |
| `validation_errors` | `jsonb` | Yes | `not null default '[]' check (jsonb_typeof(validation_errors) = 'array')` |
| `approved_at` | `timestamptz` | No | — |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
check ((status = 'approved') = (approved_at is not null))
foreign key (conversation_id, athlete_id) references public.ai_conversations(id, athlete_id)
unique (id, athlete_id)
```

## ai_usage_logs

Model request usage and estimated cost.

| Column | Data type | Required | Default / SQL rules |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | `primary key default gen_random_uuid()` |
| `athlete_id` | `uuid` | Yes | `not null references public.profiles(id) on delete restrict` |
| `conversation_id` | `uuid` | No | — |
| `request_id` | `text` | Yes | `not null unique` |
| `model` | `text` | Yes | `not null` |
| `input_tokens` | `integer` | Yes | `not null check (input_tokens >= 0)` |
| `output_tokens` | `integer` | Yes | `not null check (output_tokens >= 0)` |
| `estimated_cost_usd` | `numeric(12,6)` | Yes | `not null check (estimated_cost_usd >= 0)` |
| `created_at` | `timestamptz` | Yes | `not null default now()` |
| `updated_at` | `timestamptz` | Yes | `not null default now()` |

Table constraints and relationships:

```sql
foreign key (conversation_id, athlete_id) references public.ai_conversations(id, athlete_id)
unique (id, athlete_id)
```

## Initial data

You do not need to enter athlete data manually to establish the connection. Create your account **after** applying the migration: the signup trigger inserts one `profiles` row and one `athlete_settings` row. Other tables initially remain empty. If you already created Auth users before the migration, their profile/settings rows require a backfill because signup triggers do not run retroactively.

Profile defaults: empty name/goals/limitations, `lb` units, `beginner` experience. Settings defaults: 5 training days, 60 available minutes, `UTC` timezone and empty equipment/disciplines. These are setup defaults, not inferred athlete facts; editable onboarding is Phase 2.

The optional PR examples in the project brief (Snatch 165 lb, Clean 235 lb, Back Squat 285 lb, Overhead Squat 175 lb × 2) are not automatically inserted.

## Verify application table creation

Run this read-only query in SQL Editor after the migration. It should list exactly the 17 tables in this reference and show `rls_enabled = true` for each:

```sql
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;
```

Then test signup, email confirmation, sign-in and Profile access in AthleteOS. The transactional isolation test in `supabase/tests/isolation.sql` creates temporary Auth fixtures and rolls them back; run it only in a disposable development/staging database.
