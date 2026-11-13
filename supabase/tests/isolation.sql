-- Run against a disposable migrated local database with psql as postgres.
-- Rolls back all test fixtures. Any failed assertion raises an exception.
begin;
insert into auth.users (id, email) values
 ('00000000-0000-4000-8000-000000000001', 'isolation-a@example.test'),
 ('00000000-0000-4000-8000-000000000002', 'isolation-b@example.test');
insert into public.exercises (id, athlete_id, name, discipline) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Snatch','weightlifting'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Snatch','weightlifting');
do $$ begin
 if (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) > 0 then
   raise exception 'A public table has no RLS';
 end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare affected integer;
begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'Profile isolation failed'; end if;
 if (select count(*) from public.athlete_settings) <> 1 then raise exception 'Settings isolation failed'; end if;
 if (select count(*) from public.exercises) <> 1 then raise exception 'Exercise isolation failed'; end if;
 begin
  update public.profiles set name = 'Intruder' where id = '00000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user update succeeded'; end if;
 exception when insufficient_privilege then null; -- Phase 2 routes profile writes through its owned RPC.
 end;
 begin
   insert into public.exercises (athlete_id, name, discipline) values ('00000000-0000-4000-8000-000000000002','Intrusion','strength');
   raise exception 'Cross-user insert succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
   insert into public.personal_records (athlete_id,exercise_id,recorded_on,load,unit) values
    ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',current_date,165,'lb');
   raise exception 'Cross-user parent link succeeded';
 exception when foreign_key_violation then null;
 end;
 insert into public.personal_records (athlete_id,exercise_id,recorded_on,load,unit) values
  ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',current_date,165,'lb');
 begin
   update public.personal_records set load = 200;
   raise exception 'Historical record mutation succeeded';
 exception when insufficient_privilege then null;
 end;
 begin
   insert into public.ai_usage_logs (athlete_id,request_id,model,input_tokens,output_tokens,estimated_cost_usd) values
    ('00000000-0000-4000-8000-000000000001','spoofed','fake',1,1,0);
   raise exception 'Client usage-log write succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform * from public.profiles;
  raise exception 'Anonymous profile read succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
