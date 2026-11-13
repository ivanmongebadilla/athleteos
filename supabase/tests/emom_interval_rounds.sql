-- Run after all migrations. Fixtures are always rolled back.
begin;
insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000042','emom-rounds@example.test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000042","role":"authenticated"}',true);
do $$
declare plan jsonb; sid uuid; sec uuid; stamp timestamptz; payload jsonb; saved jsonb; rejected boolean;
begin
 plan := '{"id":null,"expected_updated_at":null,"title":"EMOM fixture","scheduled_on":"2026-11-14","status":"scheduled","intensity":"moderate","duration_minutes":30,"notes":"","published":true,"sections":[{"kind":"conditioning","format":"emom","interval_rounds":6,"emom_interval_seconds":180,"time_cap_seconds":999,"instructions":"","exercises":[]}]}';
 sid := public.save_training_session(plan);
 select updated_at into stamp from public.training_sessions where id=sid;
 select id into sec from public.workout_sections where session_id=sid;
 if not exists(select 1 from public.workout_sections where id=sec and interval_rounds=6 and emom_interval_seconds=180 and time_cap_seconds=1080) then raise exception 'Every 3 minutes x 6 rounds did not produce 18 minutes'; end if;
 payload := jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',sec,'completion_seconds',null,'rounds',2,'repetitions',null,'scaled',false,'session_rpe',null,'notes','','score_details','{"intervals":[true,false,false,false,false,true]}'::jsonb,'sets','[]'::jsonb));
 rejected:=false; begin perform public.save_workout_section(jsonb_set(payload,'{result,score_details,intervals}','[true,false,true]')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Wrong EMOM checklist length accepted'; end if;
 rejected:=false; begin perform public.save_workout_section(jsonb_set(payload,'{result,rounds}','6')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Missed rounds counted as completed'; end if;
 saved:=public.save_workout_section(payload);
 if not exists(select 1 from public.workout_results where id=(saved->>'id')::uuid and rounds=2 and jsonb_array_length(score_details->'intervals')=6) then raise exception 'EMOM completion flags lost'; end if;
 rejected:=false; begin perform public.save_training_session(jsonb_set(plan,'{sections,0,emom_interval_seconds}','0')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Zero interval accepted'; end if;
 rejected:=false; begin perform public.save_training_session(jsonb_set(plan,'{sections,0,interval_rounds}','2.5')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Fractional rounds accepted'; end if;
 rejected:=false; begin perform public.save_training_session(jsonb_set(plan,'{sections,0,emom_interval_seconds}','86400')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Excessive duration accepted'; end if;
 -- A pre-upgrade client can still supply only the original total duration.
 sid:=public.save_training_session(jsonb_set(plan,'{sections,0}',((plan->'sections'->0) - 'emom_interval_seconds' - 'interval_rounds') || '{"time_cap_seconds":180}'::jsonb));
 if not exists(select 1 from public.workout_sections where session_id=sid and interval_rounds=3 and emom_interval_seconds=60 and time_cap_seconds=180) then raise exception 'Legacy EMOM compatibility lost'; end if;
end $$;
rollback;
select 'EMOM interval and round regression passed; fixtures rolled back' as result;
