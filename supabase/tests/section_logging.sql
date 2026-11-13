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
-- Numeric-round formats must validate at the RPC boundary, not just in the UI.
do $$
declare plan jsonb; sid uuid; sec uuid; stamp timestamptz; payload jsonb; invalid jsonb; saved jsonb; first_id uuid; failed boolean; format_name text;
begin
 plan:='{"id":null,"expected_updated_at":null,"title":"Numeric rounds fixture","scheduled_on":"2026-11-13","status":"scheduled","intensity":"moderate","duration_minutes":60,"notes":"","published":true,"sections":[{"kind":"conditioning","format":"intervals","interval_rounds":5,"time_cap_seconds":null,"instructions":"5 rounds, score reps","exercises":[]}]}';
 for invalid in select value from jsonb_array_elements('[null,0,-1,1.5,1441,"5",true]'::jsonb) loop
  failed:=false;begin perform public.save_training_session(jsonb_set(plan,'{sections,0,interval_rounds}',invalid));exception when others then failed:=true;end;
  if not failed then raise exception 'Invalid plan rounds accepted: %',invalid;end if;
 end loop;
 sid:=public.save_training_session(plan);
 select updated_at into stamp from public.training_sessions where id=sid;
 select id into sec from public.workout_sections where session_id=sid;
 if (select interval_rounds from public.workout_sections where id=sec)<>5 then raise exception 'Plan round count lost';end if;
 -- Editing an unlogged plan must retain the round count as well.
 perform public.save_training_session(plan||jsonb_build_object('id',sid,'expected_updated_at',stamp));
 select updated_at into stamp from public.training_sessions where id=sid;
 select id into sec from public.workout_sections where session_id=sid;
 payload:=jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',sec,'completion_seconds',null,'rounds',5,'repetitions',50,'scaled',false,'session_rpe',null,'notes','','score_details','{"interval_scores":[10,12,8,11,9]}'::jsonb,'sets','[]'::jsonb));
 for invalid in select value from jsonb_array_elements('[[true,false,true,false,true],[1,-1,2,3,4],[1,1.5,2,3,4],[null,1,2,3,4],[100001,1,2,3,4],[10,12,8,11],[],"bad"]'::jsonb) loop
  failed:=false;begin perform public.save_workout_section(jsonb_set(payload,'{result,score_details,interval_scores}',invalid));exception when others then failed:=true;end;
  if not failed then raise exception 'Invalid numeric array accepted: %',invalid;end if;
 end loop;
 failed:=false;begin perform public.save_workout_section(jsonb_set(payload,'{result,score_details}','{"intervals":[true,true,true,true,true]}'));exception when others then failed:=true;end;
 if not failed then raise exception 'Intervals accepted EMOM flags';end if;
 failed:=false;begin perform public.save_workout_section(jsonb_set(payload,'{result,score_details}','{}'));exception when others then failed:=true;end;
 if not failed then raise exception 'Intervals accepted missing round scores';end if;
 failed:=false;begin perform public.save_workout_section(jsonb_set(payload,'{result,repetitions}','51'));exception when others then failed:=true;end;
 if not failed then raise exception 'Wrong interval sum accepted';end if;
 failed:=false;begin perform public.save_workout_section(jsonb_set(payload,'{result,rounds}','4'));exception when others then failed:=true;end;
 if not failed then raise exception 'Wrong numeric round count accepted';end if;
 failed:=false;begin perform public.complete_training_session(jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'results',jsonb_build_array(payload->'result')));exception when others then failed:=true;end;
 if not failed then raise exception 'Legacy writer bypassed numeric score validation';end if;
 saved:=public.save_workout_section(payload);first_id:=(saved->>'id')::uuid;
 if not exists(select 1 from public.workout_results where id=first_id and repetitions=50 and rounds=5 and score_details->'interval_scores'='[10,12,8,11,9]'::jsonb) then raise exception 'Numeric scores lost';end if;
 payload:=jsonb_set(payload,'{result,score_details,interval_scores}','[11,12,8,11,9]')||jsonb_build_object('expected_result_id',first_id);
 payload:=jsonb_set(payload,'{result,repetitions}','51');perform public.save_workout_section(payload);
 if (select repetitions from public.workout_results where id=first_id)<>50 then raise exception 'Numeric correction rewrote history';end if;
 -- Tabata's prescribed structure and lowest round are enforced, including zero.
 plan:=jsonb_set(plan,'{sections,0,format}','"tabata"');
 failed:=false;begin perform public.save_training_session(plan);exception when others then failed:=true;end;
 if not failed then raise exception 'Tabata plan accepted missing work/rest';end if;
 plan:=jsonb_set(jsonb_set(jsonb_set(plan,'{sections,0,interval_rounds}','8'),'{sections,0,tabata_work_seconds}','20'),'{sections,0,tabata_rest_seconds}','10');sid:=public.save_training_session(plan);
 select updated_at into stamp from public.training_sessions where id=sid;
 select id into sec from public.workout_sections where session_id=sid;
 if not exists(select 1 from public.workout_sections where id=sec and interval_rounds=8 and time_cap_seconds=240) then raise exception 'Fixed Tabata plan lost';end if;
 payload:=jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',sec,'completion_seconds',null,'rounds',8,'repetitions',0,'scaled',false,'session_rpe',null,'notes','','score_details','{"interval_scores":[12,11,10,9,8,7,6,0]}'::jsonb,'sets','[]'::jsonb));
 failed:=false;begin perform public.save_workout_section(jsonb_set(payload,'{result,repetitions}','63'));exception when others then failed:=true;end;
 if not failed then raise exception 'Tabata accepted sum instead of minimum';end if;
 failed:=false;begin perform public.save_workout_section(jsonb_set(payload,'{result,score_details,interval_scores}','[12,11,10,9,8,7,0]'));exception when others then failed:=true;end;
 if not failed then raise exception 'Tabata accepted seven rounds';end if;
 saved:=public.save_workout_section(payload);
 if not exists(select 1 from public.workout_results where id=(saved->>'id')::uuid and repetitions=0 and rounds=8) then raise exception 'Tabata zero minimum lost';end if;
 -- Numeric metadata is forbidden on EMOM, For Time, AMRAP and custom blocks.
 for format_name in select unnest(array['emom','for_time','amrap','custom']) loop
  plan:=jsonb_set(plan,'{sections,0,format}',to_jsonb(format_name));plan:=jsonb_set(plan,'{sections,0,interval_rounds}','null');plan:=jsonb_set(jsonb_set(plan,'{sections,0,tabata_work_seconds}','null'),'{sections,0,tabata_rest_seconds}','null');sid:=public.save_training_session(plan);
  select updated_at into stamp from public.training_sessions where id=sid;select id into sec from public.workout_sections where session_id=sid;
  payload:=payload||jsonb_build_object('session_id',sid,'expected_updated_at',stamp);payload:=jsonb_set(payload,'{result,section_id}',to_jsonb(sec));
  failed:=false;begin perform public.save_workout_section(payload);exception when others then failed:=true;end;
  if not failed then raise exception 'Numeric scores accepted on %',format_name;end if;
 end loop;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.save_workout_section('{}'); raise exception 'Anonymous section save allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Independent section saves, append-only corrections, immutable prescriptions, stale-save and ownership denial, completion, EMOM persistence and numeric Intervals/Tabata validation passed' as verification;
rollback;
