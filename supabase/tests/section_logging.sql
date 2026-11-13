-- Run after all migrations. Everything rolls back, including both fixture users.
begin;
insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000031','section-a@example.test'),('00000000-0000-4000-8000-000000000032','section-b@example.test');
insert into public.exercises(id,athlete_id,name,discipline) values ('10000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000031','Section squat','strength');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000031","role":"authenticated"}',true);
do $$
declare plan jsonb; sid uuid; strength_id uuid; wod_id uuid; stamp timestamptz; payload jsonb; saved jsonb; first_id uuid; second_id uuid; failed boolean;
begin
  plan := '{"id":null,"expected_updated_at":null,"title":"Section fixture","scheduled_on":"2026-11-12","status":"scheduled","intensity":"moderate","duration_minutes":60,"notes":"","published":true,"sections":[{"kind":"strength","format":null,"time_cap_seconds":null,"instructions":"","exercises":[{"exercise_id":"10000000-0000-4000-8000-000000000031","notes":"","sets":[{"repetitions":5,"load":100,"unit":"kg","percentage":null,"target_rpe":8,"rest_seconds":120}]}]},{"kind":"conditioning","format":"for_time","time_cap_seconds":600,"instructions":"21-15-9","exercises":[]}]}';
  sid := public.save_training_session(plan);
  select updated_at into stamp from public.training_sessions where id=sid;
  select id into strength_id from public.workout_sections where session_id=sid and kind='strength';
  select id into wod_id from public.workout_sections where session_id=sid and kind='conditioning';
  payload := jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',strength_id,'completion_seconds',null,'rounds',null,'repetitions',null,'scaled',false,'session_rpe',8,'notes','Strength actual','score_details','{}'::jsonb,'sets',jsonb_build_array(jsonb_build_object('exercise_id','10000000-0000-4000-8000-000000000031','set_number',1,'repetitions',4,'load',95,'unit','kg','rpe',9,'successful',true,'rest_seconds',150,'notes',''))));
  saved := public.save_workout_section(payload); first_id := (saved->>'id')::uuid;
  if (select status from public.training_sessions where id=sid)<>'scheduled' then raise exception 'Partial save completed entire session'; end if;
  failed:=false; begin perform public.save_workout_section(payload); exception when others then failed:=true; end;
  if not failed then raise exception 'Stale duplicate accepted'; end if;
  failed:=false; begin perform public.save_training_session(plan || jsonb_build_object('id',sid,'expected_updated_at',stamp)); exception when others then failed:=true; end;
  if not failed then raise exception 'Partially logged prescription edited'; end if;
  payload := payload || jsonb_build_object('expected_result_id',first_id);
  payload := jsonb_set(payload,'{result,sets,0,load}','97.5');
  saved := public.save_workout_section(payload); second_id := (saved->>'id')::uuid;
  if first_id=second_id or (select load from public.completed_sets where result_id=first_id)<>95 or (select load from public.prescribed_sets where athlete_id=auth.uid())<>100 then raise exception 'Revision changed history or prescription'; end if;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000032","role":"authenticated"}',true);
  if exists(select 1 from public.workout_results where id=first_id) then raise exception 'Foreign result visible'; end if;
  failed:=false; begin perform public.save_workout_section(payload); exception when others then failed:=true; end;
  if not failed then raise exception 'Foreign session save'; end if;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000031","role":"authenticated"}',true);
  payload := jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',wod_id,'completion_seconds',480,'rounds',null,'repetitions',null,'scaled',true,'session_rpe',7,'notes','WOD actual','score_details','{}'::jsonb,'sets','[]'::jsonb));
  failed:=false; begin perform public.save_workout_section(jsonb_set(payload,'{result,sets}','[{"exercise_id":"10000000-0000-4000-8000-000000000031","set_number":1,"repetitions":3,"load":95,"unit":"kg","rpe":8,"successful":true,"rest_seconds":120,"notes":""}]')); exception when others then failed:=true; end;
  if not failed or (select count(*) from public.workout_results where session_id=sid)<>2 then raise exception 'Foreign-section set did not roll back'; end if;
  perform public.save_workout_section(payload);
  if (select status from public.training_sessions where id=sid)<>'completed' then raise exception 'All sections did not complete session'; end if;
  -- A fresh revision remains allowed on a completed session, without rewriting an old result.
  payload := jsonb_set(payload,'{result,section_id}',to_jsonb(strength_id)) || jsonb_build_object('expected_result_id',second_id);
  perform public.save_workout_section(payload);
  if (select count(*) from public.workout_results where session_id=sid)<>4 then raise exception 'Append-only result count'; end if;
  -- Structured EMOM interval values persist and must agree with the completed-round count.
  plan := jsonb_set(plan,'{sections}','[{"kind":"conditioning","format":"emom","time_cap_seconds":180,"instructions":"Three minutes","exercises":[]}]');
  sid := public.save_training_session(plan);
  select updated_at into stamp from public.training_sessions where id=sid;
  select id into wod_id from public.workout_sections where session_id=sid;
  payload := jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',wod_id,'completion_seconds',null,'rounds',2,'repetitions',null,'scaled',false,'session_rpe',null,'notes','','score_details','{"intervals":[true,false,true]}'::jsonb,'sets','[]'::jsonb));
  failed:=false; begin perform public.save_workout_section(jsonb_set(payload,'{result,rounds}','3')); exception when others then failed:=true; end;
  if not failed then raise exception 'Mismatched intervals accepted'; end if;
  saved := public.save_workout_section(payload);
  if not exists(select 1 from public.workout_results where id=(saved->>'id')::uuid and score_details='{"intervals":[true,false,true]}'::jsonb and rounds=2) then raise exception 'Interval details lost'; end if;
  begin update public.workout_results set notes='Rewrite'; raise exception 'History mutable'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.save_workout_section('{}'); raise exception 'Anonymous section save allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Independent section saves, append-only corrections, immutable prescriptions, stale-save and ownership denial, completion and EMOM persistence passed' as verification;
rollback;
