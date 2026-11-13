-- Auth fixtures and all results roll back. Run as postgres through SQL Editor.
begin;
do $$ begin
 if (select count(*) from public.exercises where athlete_id is null)<>1379 then raise exception 'Catalog count'; end if;
 if exists(select 1 from public.exercises where athlete_id is null and (name_es is null or length(instructions->>'en')=0 or length(instructions->>'es')=0)) then raise exception 'Missing bilingual content'; end if;
 if not exists(select 1 from public.exercises where source='exercises-dataset' and source_id='0558' and name_es like '%barra%' and instructions->>'en' like '%pull-up bar%') then raise exception 'Source bar muscle-up mapping'; end if;
 if not exists(select 1 from public.exercises where source='athleteos-core' and source_id='kipping-ring-muscle-up' and name_es like '%anillas%' and equipment='rings') then raise exception 'Distinct ring muscle-up missing'; end if;
end $$;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000041','catalog-a@example.test'),
 ('00000000-0000-4000-8000-000000000042','catalog-b@example.test');
insert into public.exercises(id,athlete_id,name,discipline) values
 ('10000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000041','Private catalog test A','strength'),
 ('10000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-000000000042','Private catalog test B','strength');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000041","role":"authenticated"}',true);
do $$
declare eid uuid; sid uuid; sec uuid; stamp timestamptz; payload jsonb; saved jsonb; changed int; failed boolean;
begin
 if (select count(*) from public.exercises)<>1380 then raise exception 'Shared/private visibility'; end if;
 select id into eid from public.exercises where source='athleteos-core' and source_id='snatch';
 if eid is null then raise exception 'Snatch absent'; end if;
 update public.exercises set name='Intruder' where id=eid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Catalog modified by athlete'; end if;
 failed:=false; begin update public.exercises set athlete_id=auth.uid() where id=eid; exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Catalog ownership grant'; end if;
 failed:=false; begin insert into public.exercises(athlete_id,name,discipline) values(null,'Fake shared','strength'); exception when insufficient_privilege or check_violation then failed:=true; end;
 if not failed then raise exception 'Athlete published shared exercise'; end if;
 update public.exercises set archived=true where id='10000000-0000-4000-8000-000000000041';
 if not exists(select 1 from public.exercises where id='10000000-0000-4000-8000-000000000041' and archived) then raise exception 'Private archive broken'; end if;
 failed:=false; begin insert into public.personal_records(athlete_id,exercise_id,recorded_on,load,unit) values(auth.uid(),'10000000-0000-4000-8000-000000000042',current_date,50,'kg'); exception when foreign_key_violation then failed:=true; end;
 if not failed then raise exception 'Foreign private exercise linked'; end if;
 insert into public.personal_records(athlete_id,exercise_id,recorded_on,load,unit) values(auth.uid(),eid,current_date,50,'kg');
 payload:=jsonb_set('{"id":null,"expected_updated_at":null,"title":"Catalog session","scheduled_on":"2026-11-12","status":"scheduled","intensity":"moderate","duration_minutes":60,"notes":"","published":true,"sections":[{"kind":"weightlifting","format":null,"time_cap_seconds":null,"instructions":"","exercises":[{"exercise_id":null,"notes":"","sets":[{"repetitions":3,"load":50,"unit":"kg","percentage":null,"target_rpe":null,"rest_seconds":null}]}]}]}'::jsonb,'{sections,0,exercises,0,exercise_id}',to_jsonb(eid));
 sid:=public.save_training_session(payload);
 select updated_at into stamp from public.training_sessions where id=sid;
 select id into sec from public.workout_sections where session_id=sid;
 saved:=public.save_workout_section(jsonb_build_object('session_id',sid,'expected_updated_at',stamp,'expected_result_id',null,'result',jsonb_build_object('section_id',sec,'completion_seconds',null,'rounds',null,'repetitions',null,'scaled',false,'session_rpe',null,'notes','','score_details','{}'::jsonb,'sets',jsonb_build_array(jsonb_build_object('exercise_id',eid,'set_number',1,'repetitions',3,'load',45,'unit','kg','rpe',null,'successful',true,'rest_seconds',null,'notes','')))));
 if (select status from public.training_sessions where id=sid)<>'completed' or not exists(select 1 from public.completed_sets where exercise_id=eid and load=45) then raise exception 'Shared exercise logging'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000042","role":"authenticated"}',true);
 if not exists(select 1 from public.exercises where id=eid) then raise exception 'Second athlete lacks catalog'; end if;
 if exists(select 1 from public.personal_records where exercise_id=eid) or exists(select 1 from public.training_sessions where id=sid) then raise exception 'Shared identity exposed private history'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.exercises; raise exception 'Anonymous catalog access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Shared catalog permissions, bilingual content, PRs and session logging passed; all fixtures rolled back' as result;
