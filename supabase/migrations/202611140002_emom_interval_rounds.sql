-- EMOM / every-N-minutes prescriptions: interval duration x rounds = total duration.
begin;
alter table public.workout_sections add column emom_interval_seconds integer
  check (emom_interval_seconds is null or emom_interval_seconds between 1 and 86400);
alter table public.workout_sections drop constraint sections_numeric_round_format;
alter table public.workout_sections add constraint sections_numeric_round_format
  check (interval_rounds is null or (format is not null and format in ('intervals','tabata','emom')));
-- Keep historical results and existing total durations unchanged.
update public.workout_sections set emom_interval_seconds=60,
  interval_rounds=greatest(1,ceil(coalesce(time_cap_seconds,60)::numeric/60)::int)
where format='emom';
alter table public.workout_sections add constraint sections_emom_timing
  check (emom_interval_seconds is null or (format is not null and format='emom' and interval_rounds is not null));

create or replace function public.save_training_session_internal(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); session_id uuid := (payload->>'id')::uuid; saved_program_id uuid; saved_week_id uuid;
  section_id uuid; movement_id uuid; section jsonb; movement jsonb; prescribed jsonb; section_position int := 0; movement_position int; set_position int;
  existing public.training_sessions; program_state text; rounds int; work_seconds int; rest_seconds int; emom_seconds int;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload->'sections') <> 'array' or jsonb_array_length(payload->'sections') > 12 then raise exception 'Invalid sections'; end if;
  if payload->>'status' not in ('scheduled','rest') or ((payload->>'status'='rest') <> (jsonb_array_length(payload->'sections')=0)) then raise exception 'Invalid session'; end if;
  program_state := case when (payload->>'published')::boolean then 'published' else 'draft' end;
  if session_id is not null then
    select * into existing from public.training_sessions where id=session_id and athlete_id=owner_id and deleted_at is null for update;
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
    rounds := null; work_seconds := null; rest_seconds := null; emom_seconds := null;
    if section->>'format'='emom' then
      -- Compatibility for plans from older clients that supplied total duration only.
      if section->>'interval_rounds' is null and section->>'emom_interval_seconds' is null then
        emom_seconds := 60; rounds := greatest(1,ceil(coalesce((section->>'time_cap_seconds')::numeric,60)/60)::int);
      else
        if jsonb_typeof(section->'interval_rounds') is distinct from 'number' or (section->>'interval_rounds')::numeric <> trunc((section->>'interval_rounds')::numeric) or (section->>'interval_rounds')::numeric not between 1 and 1440 then raise exception 'Invalid EMOM round count'; end if;
        if jsonb_typeof(section->'emom_interval_seconds') is distinct from 'number' or (section->>'emom_interval_seconds')::numeric <> trunc((section->>'emom_interval_seconds')::numeric) or (section->>'emom_interval_seconds')::numeric not between 1 and 86400 then raise exception 'Invalid EMOM interval duration'; end if;
        rounds := (section->>'interval_rounds')::int; emom_seconds := (section->>'emom_interval_seconds')::int;
      end if;
      if rounds not between 1 and 1440 or rounds * emom_seconds > 86400 then raise exception 'EMOM total duration exceeds 24 hours'; end if;
    elsif section->>'format'='intervals' then
      if jsonb_typeof(section->'interval_rounds') is distinct from 'number' or (section->>'interval_rounds')::numeric <> trunc((section->>'interval_rounds')::numeric) or (section->>'interval_rounds')::numeric not between 1 and 1440 then raise exception 'Invalid interval round count'; end if;
      rounds := (section->>'interval_rounds')::int;
    elsif section->>'format'='tabata' then
      if jsonb_typeof(section->'interval_rounds') is distinct from 'number' or (section->>'interval_rounds')::numeric <> trunc((section->>'interval_rounds')::numeric) or (section->>'interval_rounds')::numeric not between 1 and 50 then raise exception 'Invalid tabata round count'; end if;
      if jsonb_typeof(section->'tabata_work_seconds') is distinct from 'number' or (section->>'tabata_work_seconds')::numeric <> trunc((section->>'tabata_work_seconds')::numeric) or (section->>'tabata_work_seconds')::numeric not between 5 and 300 then raise exception 'Invalid tabata work seconds'; end if;
      if jsonb_typeof(section->'tabata_rest_seconds') is distinct from 'number' or (section->>'tabata_rest_seconds')::numeric <> trunc((section->>'tabata_rest_seconds')::numeric) or (section->>'tabata_rest_seconds')::numeric not between 5 and 300 then raise exception 'Invalid tabata rest seconds'; end if;
      rounds := (section->>'interval_rounds')::int; work_seconds := (section->>'tabata_work_seconds')::int; rest_seconds := (section->>'tabata_rest_seconds')::int;
    elsif section->>'interval_rounds' is not null or section->>'tabata_work_seconds' is not null or section->>'tabata_rest_seconds' is not null then raise exception 'Round count outside numeric-round format';
    end if;
    if section->>'format' is distinct from 'emom' and section->>'emom_interval_seconds' is not null then raise exception 'EMOM timing outside EMOM'; end if;
    insert into public.workout_sections(athlete_id,session_id,position,kind,format,time_cap_seconds,interval_rounds,emom_interval_seconds,tabata_work_seconds,tabata_rest_seconds,instructions)
    values(owner_id,session_id,section_position,section->>'kind',section->>'format',case when section->>'format'='emom' then rounds*emom_seconds when section->>'format'='tabata' then rounds*(work_seconds+rest_seconds) else (section->>'time_cap_seconds')::int end,rounds,emom_seconds,work_seconds,rest_seconds,section->>'instructions') returning id into section_id;
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

create or replace function public.save_workout_section(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); session_row public.training_sessions; section_row public.workout_sections;
  result jsonb := payload->'result'; actual jsonb; details jsonb; latest_id uuid; saved_id uuid; saved_at timestamptz; done boolean;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(result) is distinct from 'object' or jsonb_typeof(result->'sets') is distinct from 'array' then raise exception 'Invalid result'; end if;
  select * into session_row from public.training_sessions where id=(payload->>'session_id')::uuid and athlete_id=owner_id and deleted_at is null for update;
  if not found or session_row.status not in ('scheduled','completed') then raise exception 'Session unavailable'; end if;
  if not exists(select 1 from public.training_weeks w join public.training_programs p on p.id=w.program_id where w.id=session_row.week_id and p.status='published') then raise exception 'Publish before logging'; end if;
  -- Completion changes the session timestamp, but a completed prescription can no longer change.
  if payload->>'expected_updated_at' is null or (session_row.status='scheduled' and session_row.updated_at is distinct from (payload->>'expected_updated_at')::timestamptz) then raise exception 'Session changed; reload'; end if;
  select * into section_row from public.workout_sections where id=(result->>'section_id')::uuid and session_id=session_row.id and athlete_id=owner_id;
  if not found then raise exception 'Section unavailable'; end if;
  select id into latest_id from public.workout_results where section_id=section_row.id and athlete_id=owner_id order by completed_at desc,created_at desc,id desc limit 1;
  if latest_id is distinct from (payload->>'expected_result_id')::uuid then raise exception 'Result changed; reload before updating'; end if;
  details := coalesce(result->'score_details','{}'::jsonb);
  if jsonb_typeof(details) is distinct from 'object' or exists(select 1 from jsonb_object_keys(details) k where k not in ('intervals','interval_scores','did_not_finish')) then raise exception 'Invalid score details'; end if;
  if details ? 'did_not_finish' and jsonb_typeof(details->'did_not_finish') is distinct from 'boolean' then raise exception 'Invalid completion flag'; end if;
  if details ? 'intervals' then
    if jsonb_typeof(details->'intervals') is distinct from 'array' or jsonb_array_length(details->'intervals') > 1440 then raise exception 'Invalid intervals'; end if;
    if exists(select 1 from jsonb_array_elements(details->'intervals') item where jsonb_typeof(item)<>'boolean') then raise exception 'Invalid interval'; end if;
    if section_row.format is distinct from 'emom' then raise exception 'Intervals outside interval workout'; end if;
    if section_row.interval_rounds is null or jsonb_array_length(details->'intervals') <> section_row.interval_rounds then raise exception 'EMOM prescribed round count mismatch'; end if;
    if (result->>'rounds')::int is distinct from (select count(*)::int from jsonb_array_elements(details->'intervals') item where item='true'::jsonb) then raise exception 'Interval count mismatch'; end if;
  end if;
  if details ? 'interval_scores' then
    if section_row.format is null or section_row.format not in ('intervals','tabata') then raise exception 'Numeric scores outside numeric-round format'; end if;
    if jsonb_typeof(details->'interval_scores') is distinct from 'array' or jsonb_array_length(details->'interval_scores') not between 1 and 1440 then raise exception 'Invalid numeric scores'; end if;
    if exists(select 1 from jsonb_array_elements(details->'interval_scores') item where jsonb_typeof(item)<>'number' or (item::text)::numeric<>trunc((item::text)::numeric) or (item::text)::numeric not between 0 and 100000) then raise exception 'Invalid round score'; end if;
    if section_row.interval_rounds is null or jsonb_array_length(details->'interval_scores')<>section_row.interval_rounds then raise exception 'Prescribed round count mismatch'; end if;
    if (result->>'rounds')::int is distinct from jsonb_array_length(details->'interval_scores') then raise exception 'Round count mismatch'; end if;
    if section_row.format='tabata' and (result->>'repetitions')::int is distinct from (select min((item::text)::int) from jsonb_array_elements(details->'interval_scores') item) then raise exception 'Tabata score must be the lowest round'; end if;
    if section_row.format='intervals' and (result->>'repetitions')::int is distinct from (select sum((item::text)::int)::int from jsonb_array_elements(details->'interval_scores') item) then raise exception 'Interval score must be the total'; end if;
  elsif section_row.format in ('intervals','tabata') then raise exception 'Numeric round scores required';
  end if;
  if jsonb_array_length(result->'sets') > 200 then raise exception 'Too many sets'; end if;
  if jsonb_array_length(result->'sets')=0 and result->>'completion_seconds' is null and result->>'rounds' is null and result->>'repetitions' is null and result->>'session_rpe' is null and coalesce(length(trim(result->>'notes')),0)=0 and not coalesce((details->>'did_not_finish')::boolean,false) then raise exception 'Enter an actual result'; end if;
  -- Use wall-clock time so consecutive revisions within one transaction sort reliably.
  saved_at := clock_timestamp();
  insert into public.workout_results(athlete_id,session_id,section_id,completed_at,format,completion_seconds,rounds,repetitions,scaled,session_rpe,notes,score_details)
  values(owner_id,session_row.id,section_row.id,saved_at,section_row.format,(result->>'completion_seconds')::int,(result->>'rounds')::int,(result->>'repetitions')::int,(result->>'scaled')::boolean,(result->>'session_rpe')::numeric,result->>'notes',details) returning id into saved_id;
  for actual in select value from jsonb_array_elements(result->'sets') loop
    if not exists(select 1 from public.prescribed_exercises where section_id=section_row.id and athlete_id=owner_id and exercise_id=(actual->>'exercise_id')::uuid) then raise exception 'Exercise outside section'; end if;
    insert into public.completed_sets(athlete_id,result_id,exercise_id,set_number,repetitions,load,unit,rpe,successful,rest_seconds,notes)
    values(owner_id,saved_id,(actual->>'exercise_id')::uuid,(actual->>'set_number')::int,(actual->>'repetitions')::int,(actual->>'load')::numeric,actual->>'unit',(actual->>'rpe')::numeric,(actual->>'successful')::boolean,(actual->>'rest_seconds')::int,actual->>'notes');
  end loop;
  done := not exists(select 1 from public.workout_sections s where s.session_id=session_row.id and not exists(select 1 from public.workout_results r where r.section_id=s.id and r.athlete_id=owner_id));
  if done and session_row.status <> 'completed' then update public.training_sessions set status='completed' where id=session_row.id; end if;
  return jsonb_build_object('id',saved_id,'completed_at',saved_at,'session_completed',done);
end; $$;
notify pgrst, 'reload schema';
commit;
