-- Phase 1: normalized schema. Apply using Supabase migrations, never from the browser.
begin;
create extension if not exists pgcrypto;
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  name text not null default '' check (length(name) <= 120),
  preferred_units text not null default 'lb' check (preferred_units in ('lb','kg')),
  experience text not null default 'beginner' check (experience in ('beginner','intermediate','advanced')),
  primary_goals text[] not null default '{}',
  secondary_goals text[] not null default '{}',
  limitations text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();

create table public.athlete_settings (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  training_days_per_week integer not null default 5 check (training_days_per_week between 1 and 7),
  available_minutes integer not null default 60 check (available_minutes between 10 and 300),
  timezone text not null default 'UTC',
  equipment text[] not null default '{}',
  disciplines text[] not null default '{}',
  unique (athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index athlete_settings_athlete_idx on public.athlete_settings(athlete_id);
alter table public.athlete_settings enable row level security;
revoke all on public.athlete_settings from anon, authenticated;
grant select, insert, update on public.athlete_settings to authenticated;
create policy athlete_settings_read on public.athlete_settings for select to authenticated using (athlete_id = (select auth.uid()));
create policy athlete_settings_insert on public.athlete_settings for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy athlete_settings_update on public.athlete_settings for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger athlete_settings_updated before update on public.athlete_settings for each row execute function public.touch_updated_at();

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  discipline text not null check (discipline in ('weightlifting','strength','gymnastics','conditioning','accessory','custom')),
  archived boolean not null default false,
  unique (athlete_id, name),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index exercises_athlete_idx on public.exercises(athlete_id);
alter table public.exercises enable row level security;
revoke all on public.exercises from anon, authenticated;
grant select, insert, update on public.exercises to authenticated;
create policy exercises_read on public.exercises for select to authenticated using (athlete_id = (select auth.uid()));
create policy exercises_insert on public.exercises for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy exercises_update on public.exercises for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger exercises_updated before update on public.exercises for each row execute function public.touch_updated_at();

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  exercise_id uuid not null,
  recorded_on date not null,
  load numeric(8,2) not null check (load > 0),
  unit text not null check (unit in ('lb','kg')),
  repetitions integer not null default 1 check (repetitions between 1 and 1000),
  notes text,
  foreign key (exercise_id, athlete_id) references public.exercises(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index personal_records_athlete_idx on public.personal_records(athlete_id);
alter table public.personal_records enable row level security;
revoke all on public.personal_records from anon, authenticated;
grant select, insert on public.personal_records to authenticated;
create policy personal_records_read on public.personal_records for select to authenticated using (athlete_id = (select auth.uid()));
create policy personal_records_insert on public.personal_records for insert to authenticated with check (athlete_id = (select auth.uid()));

create trigger personal_records_updated before update on public.personal_records for each row execute function public.touch_updated_at();

create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (length(name) between 1 and 160),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  goals text[] not null default '{}',
  source text not null default 'manual' check (source in ('manual','ai')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index training_programs_athlete_idx on public.training_programs(athlete_id);
alter table public.training_programs enable row level security;
revoke all on public.training_programs from anon, authenticated;
grant select, insert, update on public.training_programs to authenticated;
create policy training_programs_read on public.training_programs for select to authenticated using (athlete_id = (select auth.uid()));
create policy training_programs_insert on public.training_programs for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy training_programs_update on public.training_programs for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger training_programs_updated before update on public.training_programs for each row execute function public.touch_updated_at();

create table public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  program_id uuid not null,
  week_number integer not null check (week_number > 0),
  deload boolean not null default false,
  unique (program_id, week_number),
  foreign key (program_id, athlete_id) references public.training_programs(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index training_weeks_athlete_idx on public.training_weeks(athlete_id);
alter table public.training_weeks enable row level security;
revoke all on public.training_weeks from anon, authenticated;
grant select, insert, update on public.training_weeks to authenticated;
create policy training_weeks_read on public.training_weeks for select to authenticated using (athlete_id = (select auth.uid()));
create policy training_weeks_insert on public.training_weeks for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy training_weeks_update on public.training_weeks for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger training_weeks_updated before update on public.training_weeks for each row execute function public.touch_updated_at();

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  week_id uuid not null,
  title text not null check (length(title) between 1 and 160),
  scheduled_on date not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','rest','cancelled')),
  intensity text not null default 'moderate' check (intensity in ('low','moderate','high')),
  duration_minutes integer check (duration_minutes between 1 and 600),
  notes text,
  foreign key (week_id, athlete_id) references public.training_weeks(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index training_sessions_athlete_idx on public.training_sessions(athlete_id);
alter table public.training_sessions enable row level security;
revoke all on public.training_sessions from anon, authenticated;
grant select, insert, update on public.training_sessions to authenticated;
create policy training_sessions_read on public.training_sessions for select to authenticated using (athlete_id = (select auth.uid()));
create policy training_sessions_insert on public.training_sessions for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy training_sessions_update on public.training_sessions for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger training_sessions_updated before update on public.training_sessions for each row execute function public.touch_updated_at();

create table public.workout_sections (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  session_id uuid not null,
  position integer not null check (position >= 0),
  kind text not null check (kind in ('warmup','weightlifting','strength','gymnastics','conditioning','accessories','cooldown')),
  format text check (format in ('for_time','amrap','emom','intervals','tabata','custom')),
  time_cap_seconds integer check (time_cap_seconds > 0),
  instructions text,
  unique (session_id, position),
  foreign key (session_id, athlete_id) references public.training_sessions(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id),
  unique (id, session_id, athlete_id)
);
create index workout_sections_athlete_idx on public.workout_sections(athlete_id);
alter table public.workout_sections enable row level security;
revoke all on public.workout_sections from anon, authenticated;
grant select, insert, update on public.workout_sections to authenticated;
create policy workout_sections_read on public.workout_sections for select to authenticated using (athlete_id = (select auth.uid()));
create policy workout_sections_insert on public.workout_sections for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy workout_sections_update on public.workout_sections for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger workout_sections_updated before update on public.workout_sections for each row execute function public.touch_updated_at();

create table public.prescribed_exercises (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  section_id uuid not null,
  exercise_id uuid not null,
  position integer not null check (position >= 0),
  notes text,
  unique (section_id, position),
  foreign key (section_id, athlete_id) references public.workout_sections(id, athlete_id),
  foreign key (exercise_id, athlete_id) references public.exercises(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index prescribed_exercises_athlete_idx on public.prescribed_exercises(athlete_id);
alter table public.prescribed_exercises enable row level security;
revoke all on public.prescribed_exercises from anon, authenticated;
grant select, insert, update on public.prescribed_exercises to authenticated;
create policy prescribed_exercises_read on public.prescribed_exercises for select to authenticated using (athlete_id = (select auth.uid()));
create policy prescribed_exercises_insert on public.prescribed_exercises for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy prescribed_exercises_update on public.prescribed_exercises for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger prescribed_exercises_updated before update on public.prescribed_exercises for each row execute function public.touch_updated_at();

create table public.prescribed_sets (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  prescribed_exercise_id uuid not null,
  set_number integer not null check (set_number > 0),
  repetitions integer not null check (repetitions between 1 and 1000),
  load numeric(8,2) check (load >= 0),
  unit text check (unit in ('lb','kg')),
  percentage numeric(5,2) check (percentage > 0 and percentage <= 110),
  target_rpe numeric(3,1) check (target_rpe between 1 and 10),
  rest_seconds integer check (rest_seconds >= 0),
  check ((load is null) = (unit is null)),
  unique (prescribed_exercise_id, set_number),
  foreign key (prescribed_exercise_id, athlete_id) references public.prescribed_exercises(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index prescribed_sets_athlete_idx on public.prescribed_sets(athlete_id);
alter table public.prescribed_sets enable row level security;
revoke all on public.prescribed_sets from anon, authenticated;
grant select, insert, update on public.prescribed_sets to authenticated;
create policy prescribed_sets_read on public.prescribed_sets for select to authenticated using (athlete_id = (select auth.uid()));
create policy prescribed_sets_insert on public.prescribed_sets for insert to authenticated with check (athlete_id = (select auth.uid()));
create policy prescribed_sets_update on public.prescribed_sets for update to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create trigger prescribed_sets_updated before update on public.prescribed_sets for each row execute function public.touch_updated_at();

create table public.workout_results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  session_id uuid not null,
  section_id uuid,
  completed_at timestamptz not null default now(),
  format text check (format in ('for_time','amrap','emom','intervals','tabata','custom')),
  completion_seconds integer check (completion_seconds >= 0),
  rounds integer check (rounds >= 0),
  repetitions integer check (repetitions >= 0),
  scaled boolean not null default false,
  session_rpe numeric(3,1) check (session_rpe between 1 and 10),
  notes text,
  foreign key (session_id, athlete_id) references public.training_sessions(id, athlete_id),
  foreign key (section_id, session_id, athlete_id) references public.workout_sections(id, session_id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index workout_results_athlete_idx on public.workout_results(athlete_id);
alter table public.workout_results enable row level security;
revoke all on public.workout_results from anon, authenticated;
grant select, insert on public.workout_results to authenticated;
create policy workout_results_read on public.workout_results for select to authenticated using (athlete_id = (select auth.uid()));
create policy workout_results_insert on public.workout_results for insert to authenticated with check (athlete_id = (select auth.uid()));

create trigger workout_results_updated before update on public.workout_results for each row execute function public.touch_updated_at();

create table public.completed_sets (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  result_id uuid not null,
  exercise_id uuid not null,
  set_number integer not null check (set_number > 0),
  repetitions integer not null check (repetitions between 0 and 1000),
  load numeric(8,2) not null check (load >= 0),
  unit text not null check (unit in ('lb','kg')),
  rpe numeric(3,1) check (rpe between 1 and 10),
  successful boolean not null default true,
  rest_seconds integer check (rest_seconds >= 0),
  notes text,
  unique (result_id, exercise_id, set_number),
  foreign key (result_id, athlete_id) references public.workout_results(id, athlete_id),
  foreign key (exercise_id, athlete_id) references public.exercises(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index completed_sets_athlete_idx on public.completed_sets(athlete_id);
alter table public.completed_sets enable row level security;
revoke all on public.completed_sets from anon, authenticated;
grant select, insert on public.completed_sets to authenticated;
create policy completed_sets_read on public.completed_sets for select to authenticated using (athlete_id = (select auth.uid()));
create policy completed_sets_insert on public.completed_sets for insert to authenticated with check (athlete_id = (select auth.uid()));

create trigger completed_sets_updated before update on public.completed_sets for each row execute function public.touch_updated_at();

create table public.recovery_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  checked_on date not null,
  sleep_hours numeric(3,1) not null check (sleep_hours between 0 and 24),
  fatigue integer not null check (fatigue between 1 and 10),
  soreness integer not null check (soreness between 1 and 10),
  pain integer not null check (pain between 0 and 10),
  readiness integer not null check (readiness between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index recovery_checkins_athlete_idx on public.recovery_checkins(athlete_id);
alter table public.recovery_checkins enable row level security;
revoke all on public.recovery_checkins from anon, authenticated;
grant select, insert on public.recovery_checkins to authenticated;
create policy recovery_checkins_read on public.recovery_checkins for select to authenticated using (athlete_id = (select auth.uid()));
create policy recovery_checkins_insert on public.recovery_checkins for insert to authenticated with check (athlete_id = (select auth.uid()));

create trigger recovery_checkins_updated before update on public.recovery_checkins for each row execute function public.touch_updated_at();

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  title text not null default 'Coach conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index ai_conversations_athlete_idx on public.ai_conversations(athlete_id);
alter table public.ai_conversations enable row level security;
revoke all on public.ai_conversations from anon, authenticated;
grant select on public.ai_conversations to authenticated;
create policy ai_conversations_read on public.ai_conversations for select to authenticated using (athlete_id = (select auth.uid()));
-- Writes reserved for future narrowly scoped server operations.

create trigger ai_conversations_updated before update on public.ai_conversations for each row execute function public.touch_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant','tool')),
  content text not null,
  foreign key (conversation_id, athlete_id) references public.ai_conversations(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index ai_messages_athlete_idx on public.ai_messages(athlete_id);
alter table public.ai_messages enable row level security;
revoke all on public.ai_messages from anon, authenticated;
grant select on public.ai_messages to authenticated;
create policy ai_messages_read on public.ai_messages for select to authenticated using (athlete_id = (select auth.uid()));
-- Writes reserved for future narrowly scoped server operations.

create trigger ai_messages_updated before update on public.ai_messages for each row execute function public.touch_updated_at();

create table public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  conversation_id uuid,
  kind text not null check (kind in ('session','mesocycle','adjustment')),
  status text not null default 'draft' check (status in ('draft','validated','approved','rejected')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  validation_errors jsonb not null default '[]' check (jsonb_typeof(validation_errors) = 'array'),
  approved_at timestamptz,
  check ((status = 'approved') = (approved_at is not null)),
  foreign key (conversation_id, athlete_id) references public.ai_conversations(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index ai_proposals_athlete_idx on public.ai_proposals(athlete_id);
alter table public.ai_proposals enable row level security;
revoke all on public.ai_proposals from anon, authenticated;
grant select on public.ai_proposals to authenticated;
create policy ai_proposals_read on public.ai_proposals for select to authenticated using (athlete_id = (select auth.uid()));
-- Writes reserved for future narrowly scoped server operations.

create trigger ai_proposals_updated before update on public.ai_proposals for each row execute function public.touch_updated_at();

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete restrict,
  conversation_id uuid,
  request_id text not null unique,
  model text not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  estimated_cost_usd numeric(12,6) not null check (estimated_cost_usd >= 0),
  foreign key (conversation_id, athlete_id) references public.ai_conversations(id, athlete_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index ai_usage_logs_athlete_idx on public.ai_usage_logs(athlete_id);
alter table public.ai_usage_logs enable row level security;
revoke all on public.ai_usage_logs from anon, authenticated;
grant select on public.ai_usage_logs to authenticated;
create policy ai_usage_logs_read on public.ai_usage_logs for select to authenticated using (athlete_id = (select auth.uid()));
-- Writes reserved for future narrowly scoped server operations.

create trigger ai_usage_logs_updated before update on public.ai_usage_logs for each row execute function public.touch_updated_at();

create index sessions_schedule_idx on public.training_sessions(athlete_id, scheduled_on);
create index personal_records_history_idx on public.personal_records(athlete_id, exercise_id, recorded_on desc);
create index recovery_history_idx on public.recovery_checkins(athlete_id, checked_on desc);
create index results_history_idx on public.workout_results(athlete_id, completed_at desc);
create index messages_conversation_idx on public.ai_messages(conversation_id, created_at);

-- Signup uses fixed safe defaults, not untrusted user metadata.
create function public.handle_new_athlete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  insert into public.athlete_settings(athlete_id) values (new.id);
  return new;
end; $$;
revoke all on function public.handle_new_athlete() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_athlete();
commit;
