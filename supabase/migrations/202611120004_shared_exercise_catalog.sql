-- Shared, read-only movements and private athlete-created movements coexist.
-- Existing exercise IDs, prescriptions, results and PRs remain unchanged.
begin;
alter table public.exercises alter column athlete_id drop not null;
alter table public.exercises
  add column name_es text check (length(name_es) between 1 and 240),
  add column aliases text[] not null default '{}',
  add column equipment text,
  add column body_part text,
  add column target text,
  add column secondary_muscles text[] not null default '{}',
  add column instructions jsonb not null default '{}' check (jsonb_typeof(instructions)='object'),
  add column source text,
  add column source_id text,
  add column source_revision text,
  add column source_url text,
  add constraint exercises_shared_metadata check (athlete_id is not null or (name_es is not null and source is not null and source_id is not null));
create unique index exercises_catalog_identity on public.exercises(source,source_id) where athlete_id is null;
create index exercises_catalog_idx on public.exercises(name,id) where athlete_id is null;
drop policy exercises_read on public.exercises;
create policy exercises_read on public.exercises for select to authenticated using (athlete_id is null or athlete_id=(select auth.uid()));
-- Users can add/edit their own names and archive private exercises, but cannot
-- publish, claim ownership of, translate or modify a catalog exercise.
revoke insert, update on public.exercises from authenticated;
grant insert(athlete_id,name,discipline) on public.exercises to authenticated;
grant update(name,discipline,archived) on public.exercises to authenticated;

-- Composite owner FKs cannot reference a shared exercise. Preserve an ordinary
-- exercise FK and enforce shared-or-same-owner on every referencing write.
create function public.check_exercise_reference() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.exercises e where e.id=new.exercise_id and (e.athlete_id is null or e.athlete_id=new.athlete_id)) then
    raise foreign_key_violation using message='Exercise unavailable to this athlete';
  end if;
  return new;
end; $$;
revoke all on function public.check_exercise_reference() from public, anon, authenticated;
alter table public.personal_records drop constraint personal_records_exercise_id_athlete_id_fkey;
alter table public.personal_records add constraint personal_records_exercise_id_fkey foreign key(exercise_id) references public.exercises(id) on delete restrict;
create trigger personal_records_exercise_access before insert or update of athlete_id,exercise_id on public.personal_records for each row execute function public.check_exercise_reference();
alter table public.prescribed_exercises drop constraint prescribed_exercises_exercise_id_athlete_id_fkey;
alter table public.prescribed_exercises add constraint prescribed_exercises_exercise_id_fkey foreign key(exercise_id) references public.exercises(id) on delete restrict;
create trigger prescribed_exercises_exercise_access before insert or update of athlete_id,exercise_id on public.prescribed_exercises for each row execute function public.check_exercise_reference();
alter table public.completed_sets drop constraint completed_sets_exercise_id_athlete_id_fkey;
alter table public.completed_sets add constraint completed_sets_exercise_id_fkey foreign key(exercise_id) references public.exercises(id) on delete restrict;
create trigger completed_sets_exercise_access before insert or update of athlete_id,exercise_id on public.completed_sets for each row execute function public.check_exercise_reference();

-- Updated internal writer follows below; public payload guards stay in place.
create or replace function public.save_training_session_internal(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); session_id uuid := (payload->>'id')::uuid; saved_program_id uuid; saved_week_id uuid;
  section_id uuid; movement_id uuid; section jsonb; movement jsonb; prescribed jsonb; section_position int := 0; movement_position int; set_position int;
  existing public.training_sessions; program_state text;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload->'sections') <> 'array' or jsonb_array_length(payload->'sections') > 12 then raise exception 'Invalid sections'; end if;
  if payload->>'status' not in ('scheduled','rest') or ((payload->>'status'='rest') <> (jsonb_array_length(payload->'sections')=0)) then raise exception 'Invalid session'; end if;
  program_state := case when (payload->>'published')::boolean then 'published' else 'draft' end;
  if session_id is not null then
    select * into existing from public.training_sessions where id=session_id and athlete_id=owner_id for update;
    if not found then raise exception 'Session unavailable'; end if;
    if existing.updated_at <> (payload->>'expected_updated_at')::timestamptz then raise exception 'Session changed; reload before saving'; end if;
    if existing.status in ('completed','cancelled') or exists(select 1 from public.workout_results where workout_results.session_id=existing.id) then raise exception 'Recorded sessions are immutable'; end if;
    select w.program_id into saved_program_id from public.training_weeks w where w.id=existing.week_id and w.athlete_id=owner_id;
    -- A manually created session has its own program container; never alter an AI or multi-session program here.
    if (select count(*) from public.training_sessions s join public.training_weeks w on w.id=s.week_id where w.program_id=saved_program_id) <> 1 then raise exception 'Program editing unavailable'; end if;
    delete from public.prescribed_sets ps using public.prescribed_exercises pe, public.workout_sections ws where ps.prescribed_exercise_id=pe.id and pe.section_id=ws.id and ws.session_id=existing.id;
    delete from public.prescribed_exercises pe using public.workout_sections ws where pe.section_id=ws.id and ws.session_id=existing.id;
    delete from public.workout_sections ws where ws.session_id=existing.id;
    update public.training_programs set name=payload->>'title', status=program_state, starts_on=(payload->>'scheduled_on')::date, ends_on=(payload->>'scheduled_on')::date where id=saved_program_id and athlete_id=owner_id;
    update public.training_sessions set title=payload->>'title', scheduled_on=(payload->>'scheduled_on')::date, status=payload->>'status', intensity=payload->>'intensity', duration_minutes=(payload->>'duration_minutes')::int, notes=payload->>'notes' where id=session_id;
  else
    insert into public.training_programs(athlete_id,name,status,starts_on,ends_on) values(owner_id,payload->>'title',program_state,(payload->>'scheduled_on')::date,(payload->>'scheduled_on')::date) returning id into saved_program_id;
    insert into public.training_weeks(athlete_id,program_id,week_number) values(owner_id,saved_program_id,1) returning id into saved_week_id;
    insert into public.training_sessions(athlete_id,week_id,title,scheduled_on,status,intensity,duration_minutes,notes) values(owner_id,saved_week_id,payload->>'title',(payload->>'scheduled_on')::date,payload->>'status',payload->>'intensity',(payload->>'duration_minutes')::int,payload->>'notes') returning id into session_id;
  end if;
  for section in select value from jsonb_array_elements(payload->'sections') loop
    insert into public.workout_sections(athlete_id,session_id,position,kind,format,time_cap_seconds,instructions) values(owner_id,session_id,section_position,section->>'kind',section->>'format',(section->>'time_cap_seconds')::int,section->>'instructions') returning id into section_id;
    section_position := section_position+1; movement_position := 0;
    if jsonb_array_length(section->'exercises') > 30 then raise exception 'Too many exercises'; end if;
    for movement in select value from jsonb_array_elements(section->'exercises') loop
      if not exists(select 1 from public.exercises where id=(movement->>'exercise_id')::uuid and (athlete_id=owner_id or athlete_id is null)) then raise exception 'Exercise unavailable'; end if;
      insert into public.prescribed_exercises(athlete_id,section_id,exercise_id,position,notes) values(owner_id,section_id,(movement->>'exercise_id')::uuid,movement_position,movement->>'notes') returning id into movement_id;
      movement_position := movement_position+1; set_position := 0;
      if jsonb_array_length(movement->'sets') > 50 then raise exception 'Too many sets'; end if;
      for prescribed in select value from jsonb_array_elements(movement->'sets') loop
        set_position := set_position+1;
        insert into public.prescribed_sets(athlete_id,prescribed_exercise_id,set_number,repetitions,load,unit,percentage,target_rpe,rest_seconds)
        values(owner_id,movement_id,set_position,(prescribed->>'repetitions')::int,(prescribed->>'load')::numeric,case when prescribed->>'load' is null then null else prescribed->>'unit' end,(prescribed->>'percentage')::numeric,(prescribed->>'target_rpe')::numeric,(prescribed->>'rest_seconds')::int);
      end loop;
    end loop;
  end loop;
  return session_id;
end; $$;


revoke all on function public.save_training_session_internal(jsonb) from public, anon, authenticated;
commit;
