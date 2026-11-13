-- All fixture accounts, sessions and results roll back. No passwords or emails are created/sent.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000011','phase2-a@example.test'),
 ('00000000-0000-4000-8000-000000000012','phase2-b@example.test');
insert into public.exercises(id,athlete_id,name,discipline) values
 ('10000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000011','Phase2 squat','strength'),
 ('10000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000012','Phase2 squat','strength');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
do $$
declare sid uuid; sec uuid; stamp timestamptz; payload jsonb; actual jsonb; failed boolean; n int; wod_format text;
begin
  perform public.save_athlete_profile('{"name":"Phase 2 fixture","preferred_units":"kg","experience":"intermediate","primary_goals":["Strength"],"secondary_goals":[],"limitations":[],"training_days_per_week":5,"available_minutes":60,"timezone":"America/Tijuana","equipment":["Barbell"],"disciplines":["Weightlifting"]}');
  if not exists(select 1 from public.athlete_settings where onboarding_completed_at is not null) then raise exception 'Onboarding failed'; end if;
  payload := '{"id":null,"expected_updated_at":null,"title":"Fixture session","scheduled_on":"2026-11-12","status":"scheduled","intensity":"moderate","duration_minutes":60,"notes":"","published":false,"sections":[{"kind":"strength","format":"for_time","time_cap_seconds":600,"instructions":"Test","exercises":[{"exercise_id":"10000000-0000-4000-8000-000000000011","notes":"","sets":[{"repetitions":5,"load":100,"unit":"kg","percentage":null,"target_rpe":8,"rest_seconds":120}]}]}]}';
  sid := public.save_training_session(payload);
  if (select count(*) from public.prescribed_sets) <> 1 then raise exception 'Prescription not saved'; end if;
  select updated_at into stamp from public.training_sessions where id=sid;
  select id into sec from public.workout_sections where session_id=sid;
  actual := jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'results',jsonb_build_array(jsonb_build_object('section_id',sec,'completion_seconds',420,'rounds',null,'repetitions',null,'scaled',false,'session_rpe',8,'notes','Actual differs','sets',jsonb_build_array(jsonb_build_object('exercise_id','10000000-0000-4000-8000-000000000011','set_number',1,'repetitions',4,'load',95,'unit','kg','rpe',9,'successful',true,'rest_seconds',150,'notes','')))));
  failed := false; begin perform public.complete_training_session(actual); exception when others then failed := true; end;
  if not failed then raise exception 'Draft logging accepted'; end if;
  -- Editing and rescheduling replace only an unlogged plan, atomically.
  payload := payload || jsonb_build_object('id',sid,'expected_updated_at',stamp,'scheduled_on','2026-11-13','published',true);
  perform public.save_training_session(payload);
  if (select scheduled_on from public.training_sessions where id=sid) <> '2026-11-13' then raise exception 'Reschedule failed'; end if;
  select updated_at into stamp from public.training_sessions where id=sid;
  select id into sec from public.workout_sections where session_id=sid;
  payload := payload || jsonb_build_object('expected_updated_at',stamp);
  -- A bad exercise rolls the entire replacement back, keeping the original plan.
  failed := false; begin perform public.save_training_session(jsonb_set(payload,'{sections,0,exercises,0,exercise_id}','"10000000-0000-4000-8000-000000000012"')); exception when others then failed := true; end;
  if not failed or not exists(select 1 from public.workout_sections where id=sec) then raise exception 'Atomic replacement/ownership failed'; end if;
  -- User B cannot read or save A's session, even with known UUID and version.
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000012","role":"authenticated"}',true);
  if exists(select 1 from public.training_sessions where id=sid) then raise exception 'Cross-user read'; end if;
  failed := false; begin perform public.save_training_session(payload); exception when others then failed := true; end;
  if not failed then raise exception 'Cross-user save'; end if;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
  -- Logging does not mutate planned weights or historical PRs.
  insert into public.personal_records(athlete_id,exercise_id,recorded_on,load,unit) values('00000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','2026-01-01',120,'kg');
  actual := jsonb_set(actual,'{expected_updated_at}',to_jsonb(stamp));
  actual := jsonb_set(actual,'{results,0,section_id}',to_jsonb(sec));
  failed := false; begin perform public.complete_training_session(actual - 'results'); exception when others then failed := true; end;
  if not failed then raise exception 'Missing results accepted'; end if;
  failed := false; begin perform public.complete_training_session(actual - 'expected_updated_at'); exception when others then failed := true; end;
  if not failed then raise exception 'Missing version accepted'; end if;
  perform public.complete_training_session(actual);
  if (select status from public.training_sessions where id=sid) <> 'completed' then raise exception 'Completion failed'; end if;
  if (select load from public.prescribed_sets) <> 100 or (select load from public.completed_sets) <> 95 then raise exception 'Planned/actual conflated'; end if;
  if (select load from public.personal_records) <> 120 then raise exception 'PR history altered'; end if;
  failed := false; begin perform public.complete_training_session(actual); exception when others then failed := true; end;
  if not failed or (select count(*) from public.workout_results) <> 1 then raise exception 'Duplicate logging'; end if;
  failed := false; begin perform public.save_training_session(payload); exception when others then failed := true; end;
  if not failed then raise exception 'Completed plan editable'; end if;
  begin update public.training_sessions set status='scheduled' where id=sid; raise exception 'Direct session writes allowed'; exception when insufficient_privilege then null; end;
  begin update public.completed_sets set load=1; raise exception 'Actual history editable'; exception when insufficient_privilege then null; end;
  begin update public.personal_records set load=1; raise exception 'PR history editable'; exception when insufficient_privilege then null; end;
  -- Stale edits fail; rest days need no sections.
  payload := payload || '{"id":null,"expected_updated_at":null,"status":"rest","sections":[]}';
  sid := public.save_training_session(payload);
  failed := false; begin perform public.save_training_session(payload || jsonb_build_object('id',sid,'expected_updated_at','2000-01-01T00:00:00Z')); exception when others then failed := true; end;
  if not failed then raise exception 'Stale edit accepted'; end if;
  -- Numeric round formats use the per-section writer; covered in section_logging.sql.
  foreach wod_format in array array['for_time','amrap','emom','custom'] loop
    payload := payload || jsonb_build_object('id',null,'expected_updated_at',null,'status','scheduled','sections',jsonb_build_array(jsonb_build_object('kind','conditioning','format',wod_format,'time_cap_seconds',600,'instructions','Score fixture','exercises','[]'::jsonb)));
    sid := public.save_training_session(payload);
    select updated_at into stamp from public.training_sessions where id=sid;
    select id into sec from public.workout_sections where session_id=sid;
    actual := jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'results',jsonb_build_array(jsonb_build_object('section_id',sec,'completion_seconds',480,'rounds',8,'repetitions',5,'scaled',true,'session_rpe',7,'notes','Score fixture','sets','[]'::jsonb)));
    perform public.complete_training_session(actual);
    if not exists(select 1 from public.workout_results where session_id=sid and format=wod_format and rounds=8 and repetitions=5 and completion_seconds=480 and scaled) then raise exception 'Score format failed: %',wod_format; end if;
  end loop;
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'Profile isolation failed'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.save_training_session('{}'); raise exception 'Anonymous RPC allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Phase 2 atomic saves, rescheduling, planned/actual separation, immutable history, ownership and anonymous denial passed; fixtures rolled back' as verification;
rollback;
