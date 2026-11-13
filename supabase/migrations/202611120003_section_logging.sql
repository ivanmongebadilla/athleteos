begin;
alter table public.workout_results add column score_details jsonb not null default '{}'::jsonb check (jsonb_typeof(score_details)='object');
create index results_section_history_idx on public.workout_results(athlete_id,section_id,completed_at desc,created_at desc);

-- Append-only per-section revisions; the session row serializes saves and plan edits.
create function public.save_workout_section(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); session_row public.training_sessions; section_row public.workout_sections;
  result jsonb := payload->'result'; actual jsonb; details jsonb; latest_id uuid; saved_id uuid; saved_at timestamptz; done boolean;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(result) is distinct from 'object' or jsonb_typeof(result->'sets') is distinct from 'array' then raise exception 'Invalid result'; end if;
  select * into session_row from public.training_sessions where id=(payload->>'session_id')::uuid and athlete_id=owner_id for update;
  if not found or session_row.status not in ('scheduled','completed') then raise exception 'Session unavailable'; end if;
  if not exists(select 1 from public.training_weeks w join public.training_programs p on p.id=w.program_id where w.id=session_row.week_id and p.status='published') then raise exception 'Publish before logging'; end if;
  -- Completion changes the session timestamp, but a completed prescription can no longer change.
  if payload->>'expected_updated_at' is null or (session_row.status='scheduled' and session_row.updated_at is distinct from (payload->>'expected_updated_at')::timestamptz) then raise exception 'Session changed; reload'; end if;
  select * into section_row from public.workout_sections where id=(result->>'section_id')::uuid and session_id=session_row.id and athlete_id=owner_id;
  if not found then raise exception 'Section unavailable'; end if;
  select id into latest_id from public.workout_results where section_id=section_row.id and athlete_id=owner_id order by completed_at desc,created_at desc,id desc limit 1;
  if latest_id is distinct from (payload->>'expected_result_id')::uuid then raise exception 'Result changed; reload before updating'; end if;
  details := coalesce(result->'score_details','{}'::jsonb);
  if jsonb_typeof(details) is distinct from 'object' or exists(select 1 from jsonb_object_keys(details) k where k not in ('intervals','did_not_finish')) then raise exception 'Invalid score details'; end if;
  if details ? 'did_not_finish' and jsonb_typeof(details->'did_not_finish') is distinct from 'boolean' then raise exception 'Invalid completion flag'; end if;
  if details ? 'intervals' then
    if jsonb_typeof(details->'intervals') is distinct from 'array' or jsonb_array_length(details->'intervals') > 1440 then raise exception 'Invalid intervals'; end if;
    if exists(select 1 from jsonb_array_elements(details->'intervals') item where jsonb_typeof(item)<>'boolean') then raise exception 'Invalid interval'; end if;
    if section_row.format not in ('emom','intervals','tabata') or section_row.format is null then raise exception 'Intervals outside interval workout'; end if;
    if (result->>'rounds')::int is distinct from (select count(*)::int from jsonb_array_elements(details->'intervals') item where item='true'::jsonb) then raise exception 'Interval count mismatch'; end if;
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
revoke all on function public.save_workout_section(jsonb) from public,anon;
grant execute on function public.save_workout_section(jsonb) to authenticated;
commit;
