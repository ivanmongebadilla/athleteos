-- Rollback-only ownership, history preservation, stale-write and Undo checks.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000051','deletion-a@example.test'),
 ('00000000-0000-4000-8000-000000000052','deletion-b@example.test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}',true);
do $$
declare sid uuid; eid uuid; sec uuid; stamp timestamptz; plan jsonb; actual jsonb; failed boolean; saved_result_id uuid;
begin
 select id into eid from public.exercises where source='athleteos-core' and source_id='snatch';
 insert into public.personal_records(athlete_id,exercise_id,recorded_on,load,unit) values(auth.uid(),eid,current_date,100,'kg');
 plan:=jsonb_set('{"id":null,"expected_updated_at":null,"title":"Deletion fixture","scheduled_on":"2026-11-12","status":"scheduled","intensity":"moderate","duration_minutes":60,"notes":"","published":true,"sections":[{"kind":"weightlifting","format":null,"time_cap_seconds":null,"instructions":"Keep this plan","exercises":[{"exercise_id":null,"notes":"","sets":[{"repetitions":3,"load":50,"unit":"kg","percentage":null,"target_rpe":null,"rest_seconds":null}]}]}]}'::jsonb,'{sections,0,exercises,0,exercise_id}',to_jsonb(eid));
 sid:=public.save_training_session(plan);
 select updated_at into stamp from public.training_sessions where id=sid;
 failed:=false;begin perform public.delete_training_session(jsonb_build_object('id',sid,'expected_updated_at',stamp-interval '1 second'));exception when others then failed:=true;end;
 if not failed then raise exception 'Stale deletion accepted';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000052","role":"authenticated"}',true);
 failed:=false;begin perform public.delete_training_session(jsonb_build_object('id',sid,'expected_updated_at',stamp));exception when others then failed:=true;end;
 if not failed then raise exception 'Foreign session deleted';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}',true);
 perform public.delete_training_session(jsonb_build_object('id',sid,'expected_updated_at',stamp));
 if exists(select 1 from public.training_sessions where id=sid) then raise exception 'Deleted session still visible';end if;
 failed:=false;begin perform public.save_training_session(plan||jsonb_build_object('id',sid,'expected_updated_at',stamp));exception when others then failed:=true;end;
 if not failed then raise exception 'Old editor revived deleted session';end if;
 perform public.restore_training_session(sid);
 if not exists(select 1 from public.training_sessions where id=sid) then raise exception 'Undo did not restore session';end if;
 select id into sec from public.workout_sections where session_id=sid;
 select updated_at into stamp from public.training_sessions where id=sid;
 actual:=jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',sec,'completion_seconds',null,'rounds',null,'repetitions',null,'scaled',false,'session_rpe',null,'notes','Keep this result','score_details','{}'::jsonb,'sets',jsonb_build_array(jsonb_build_object('exercise_id',eid,'set_number',1,'repetitions',3,'load',45,'unit','kg','rpe',null,'successful',true,'rest_seconds',null,'notes',''))));
 saved_result_id:=(public.save_workout_section(actual)->>'id')::uuid;
 select updated_at into stamp from public.training_sessions where id=sid;
 if not exists(select 1 from public.training_sessions where id=sid and status='completed') then raise exception 'Expected completed session';end if;
 failed:=false;begin perform public.delete_training_session(jsonb_build_object('id',sid,'expected_updated_at',stamp));exception when raise_exception then
  if sqlerrm<>'Completed sessions and sessions with logged results cannot be deleted' then raise;end if;failed:=true;end;
 if not failed then raise exception 'Completed session deletion accepted';end if;
 if not exists(select 1 from public.workout_results where id=saved_result_id and notes='Keep this result') or not exists(select 1 from public.completed_sets where result_id=saved_result_id and load=45) then raise exception 'Result history lost';end if;
 if (select count(*) from public.personal_records)<>1 or (select load from public.prescribed_sets where athlete_id=auth.uid())<>50 then raise exception 'PR or prescription changed';end if;
 -- A two-section session remains scheduled after its first result, but is protected.
 sid:=public.save_training_session(plan||jsonb_build_object('title','Partial fixture','sections',(plan->'sections')||(plan->'sections')));
 select id into sec from public.workout_sections where session_id=sid order by position limit 1;
 select updated_at into stamp from public.training_sessions where id=sid;
 actual:=actual||jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'result',(actual->'result')||jsonb_build_object('section_id',sec));
 perform public.save_workout_section(actual);
 if not exists(select 1 from public.training_sessions where id=sid and status='scheduled') then raise exception 'Expected partial scheduled session';end if;
 select updated_at into stamp from public.training_sessions where id=sid;
 failed:=false;begin perform public.delete_training_session(jsonb_build_object('id',sid,'expected_updated_at',stamp));exception when raise_exception then
  if sqlerrm<>'Completed sessions and sessions with logged results cannot be deleted' then raise;end if;failed:=true;end;
 if not failed then raise exception 'Partially logged session deletion accepted';end if;
 -- Old editors and loggers must not revive a deleted, unlogged session.
 sid:=public.save_training_session(plan||jsonb_build_object('title','Pending logger fixture'));
 select id into sec from public.workout_sections where session_id=sid;
 select updated_at into stamp from public.training_sessions where id=sid;
 actual:=actual||jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'result',(actual->'result')||jsonb_build_object('section_id',sec));
 perform public.delete_training_session(jsonb_build_object('id',sid,'expected_updated_at',stamp));
 failed:=false;begin perform public.save_workout_section(actual);exception when others then failed:=true;end;
 if not failed then raise exception 'Old logger wrote to deleted session';end if;
 failed:=false;begin perform public.complete_training_session(jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'results',jsonb_build_array(actual->'result')));exception when others then failed:=true;end;
 if not failed then raise exception 'Legacy logger wrote to deleted session';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000052","role":"authenticated"}',true);
 failed:=false;begin perform public.restore_training_session(sid);exception when others then failed:=true;end;
 if not failed then raise exception 'Foreign session restored';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}',true);
 perform public.restore_training_session(sid);
 failed:=false;begin update public.training_sessions set deleted_at=now() where id=sid;exception when insufficient_privilege then failed:=true;end;
 if not failed then raise exception 'Direct deletion bypass';end if;
end $$;
reset role;
update public.training_sessions set status='completed' where athlete_id='00000000-0000-4000-8000-000000000051' and title='Pending logger fixture';
set local role authenticated;
do $$ declare sid uuid; stamp timestamptz; failed boolean:=false; begin
 select id,updated_at into sid,stamp from public.training_sessions where title='Pending logger fixture';
 if sid is null then raise exception 'Missing completed status fixture';end if;
 if exists(select 1 from public.workout_results where session_id=sid) then raise exception 'Expected no result rows';end if;
 begin perform public.delete_training_session(jsonb_build_object('id',sid,'expected_updated_at',stamp));exception when raise_exception then
  if sqlerrm<>'Completed sessions and sessions with logged results cannot be deleted' then raise;end if;failed:=true;end;
 if not failed then raise exception 'Completed status without results was deleted';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.delete_training_session('{}');raise exception 'Anonymous delete';exception when insufficient_privilege then null;end;
 begin perform public.restore_training_session('00000000-0000-4000-8000-000000000051');raise exception 'Anonymous restore';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Completed/partial deletion guards, ownership, stale writes, history and pending Undo passed; fixtures rolled back' as result;
