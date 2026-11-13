-- Transactional regression test; no fixture users or sessions are retained.
begin;
insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000041','tabata-config@example.test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000041","role":"authenticated"}',true);
do $$
declare plan jsonb; sid uuid; sec uuid; stamp timestamptz; payload jsonb; saved jsonb; rejected boolean;
begin
 plan := '{"id":null,"expected_updated_at":null,"title":"Tabata configuration fixture","scheduled_on":"2026-11-14","status":"scheduled","intensity":"moderate","duration_minutes":30,"notes":"","published":true,"sections":[{"kind":"conditioning","format":"tabata","interval_rounds":3,"tabata_work_seconds":30,"tabata_rest_seconds":15,"time_cap_seconds":999,"instructions":"","exercises":[]}]}';
 sid := public.save_training_session(plan);
 select updated_at into stamp from public.training_sessions where id=sid;
 select id into sec from public.workout_sections where session_id=sid;
 if not exists(select 1 from public.workout_sections where id=sec and interval_rounds=3 and tabata_work_seconds=30 and tabata_rest_seconds=15 and time_cap_seconds=135) then raise exception 'Configurable timing was not persisted'; end if;
 payload := jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',sec,'completion_seconds',null,'rounds',3,'repetitions',4,'scaled',false,'session_rpe',null,'notes','','score_details','{"interval_scores":[7,4,6]}'::jsonb,'sets','[]'::jsonb));
 rejected:=false; begin perform public.save_workout_section(jsonb_set(payload,'{result,score_details,interval_scores}','[7,4]')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Incorrect round count accepted'; end if;
 rejected:=false; begin perform public.save_workout_section(jsonb_set(payload,'{result,repetitions}','17')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Total accepted instead of lowest round'; end if;
 saved:=public.save_workout_section(payload);
 if not exists(select 1 from public.workout_results where id=(saved->>'id')::uuid and rounds=3 and repetitions=4 and score_details='{"interval_scores":[7,4,6]}'::jsonb) then raise exception 'Configured round scores lost'; end if;
 rejected:=false; begin perform public.save_training_session(jsonb_set(plan,'{sections,0,tabata_work_seconds}','4')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Invalid work duration accepted'; end if;
 rejected:=false; begin perform public.save_training_session(jsonb_set(plan,'{sections,0,tabata_rest_seconds}','301')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Invalid rest duration accepted'; end if;
 rejected:=false; begin perform public.save_training_session(jsonb_set(plan,'{sections,0,interval_rounds}','51')); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Invalid Tabata round count accepted'; end if;
end $$;
rollback;
select 'Configurable Tabata RPC regression passed; fixtures rolled back' as result;
