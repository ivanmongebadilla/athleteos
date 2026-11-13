begin;
alter table public.athlete_settings add column onboarding_completed_at timestamptz;

-- Multi-row writes use narrowly scoped, authenticated transactions. Never accept an owner ID.
create function public.save_athlete_profile(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from pg_timezone_names where name = payload->>'timezone') then raise exception 'Invalid timezone'; end if;
  update public.profiles set name=payload->>'name', preferred_units=payload->>'preferred_units', experience=payload->>'experience',
    primary_goals=array(select jsonb_array_elements_text(payload->'primary_goals')), secondary_goals=array(select jsonb_array_elements_text(payload->'secondary_goals')),
    limitations=array(select jsonb_array_elements_text(payload->'limitations')) where id=owner_id;
  update public.athlete_settings set training_days_per_week=(payload->>'training_days_per_week')::int, available_minutes=(payload->>'available_minutes')::int,
    timezone=payload->>'timezone', equipment=array(select jsonb_array_elements_text(payload->'equipment')), disciplines=array(select jsonb_array_elements_text(payload->'disciplines')),
    onboarding_completed_at=coalesce(onboarding_completed_at, now()) where athlete_id=owner_id;
end; $$;

create function public.save_training_session(payload jsonb) returns uuid
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
      if not exists(select 1 from public.exercises where id=(movement->>'exercise_id')::uuid and athlete_id=owner_id) then raise exception 'Exercise unavailable'; end if;
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

create function public.complete_training_session(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); existing public.training_sessions; result jsonb; actual jsonb; result_id uuid; section public.workout_sections;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  select * into existing from public.training_sessions where id=(payload->>'session_id')::uuid and athlete_id=owner_id for update;
  if not found or existing.status <> 'scheduled' then raise exception 'Session unavailable for logging'; end if;
  if existing.updated_at <> (payload->>'expected_updated_at')::timestamptz then raise exception 'Session changed; reload before logging'; end if;
  if not exists(select 1 from public.training_weeks w join public.training_programs p on p.id=w.program_id where w.id=existing.week_id and p.status='published') then raise exception 'Publish before logging'; end if;
  if exists(select 1 from public.workout_results where session_id=existing.id) then raise exception 'Already logged'; end if;
  if jsonb_typeof(payload->'results') <> 'array' or jsonb_array_length(payload->'results') <> (select count(*) from public.workout_sections where session_id=existing.id) then raise exception 'Log every section'; end if;
  if (select count(distinct value->>'section_id') from jsonb_array_elements(payload->'results')) <> jsonb_array_length(payload->'results') then raise exception 'Duplicate section'; end if;
  for result in select value from jsonb_array_elements(payload->'results') loop
    select * into section from public.workout_sections where id=(result->>'section_id')::uuid and session_id=existing.id and athlete_id=owner_id;
    if not found then raise exception 'Section unavailable'; end if;
    insert into public.workout_results(athlete_id,session_id,section_id,format,completion_seconds,rounds,repetitions,scaled,session_rpe,notes)
    values(owner_id,existing.id,section.id,section.format,(result->>'completion_seconds')::int,(result->>'rounds')::int,(result->>'repetitions')::int,(result->>'scaled')::boolean,(result->>'session_rpe')::numeric,result->>'notes') returning id into result_id;
    if jsonb_array_length(result->'sets') > 200 then raise exception 'Too many sets'; end if;
    for actual in select value from jsonb_array_elements(result->'sets') loop
      if not exists(select 1 from public.prescribed_exercises where section_id=section.id and exercise_id=(actual->>'exercise_id')::uuid and athlete_id=owner_id) then raise exception 'Exercise outside section'; end if;
      insert into public.completed_sets(athlete_id,result_id,exercise_id,set_number,repetitions,load,unit,rpe,successful,rest_seconds,notes)
      values(owner_id,result_id,(actual->>'exercise_id')::uuid,(actual->>'set_number')::int,(actual->>'repetitions')::int,(actual->>'load')::numeric,actual->>'unit',(actual->>'rpe')::numeric,(actual->>'successful')::boolean,(actual->>'rest_seconds')::int,actual->>'notes');
    end loop;
  end loop;
  update public.training_sessions set status='completed' where id=existing.id;
end; $$;

-- Remove direct write paths around atomic operations and prescription freezing.
revoke insert, update on public.training_programs, public.training_weeks, public.training_sessions, public.workout_sections, public.prescribed_exercises, public.prescribed_sets from authenticated;
revoke insert on public.workout_results, public.completed_sets from authenticated;
revoke update on public.profiles, public.athlete_settings from authenticated;
revoke all on function public.save_athlete_profile(jsonb), public.save_training_session(jsonb), public.complete_training_session(jsonb) from public, anon;
grant execute on function public.save_athlete_profile(jsonb), public.save_training_session(jsonb), public.complete_training_session(jsonb) to authenticated;
commit;
