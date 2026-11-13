begin;
insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000043','coach-a@example.test'),('00000000-0000-4000-8000-000000000044','coach-b@example.test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000043","role":"authenticated"}',true);
do $$
declare saved jsonb; updated jsonb; rejected boolean;
begin
 saved:=public.save_coach_preferences('{"focus":"weightlifting","goal":"Improve snatch","coaching_style":"detailed","expected_updated_at":null}');
 if saved->>'focus'<>'weightlifting' or (select count(*) from public.coach_preferences)<>1 then raise exception 'Coach preferences not saved'; end if;
 rejected:=false; begin perform public.save_coach_preferences('{"focus":"strength","goal":"","coaching_style":"concise","expected_updated_at":null}'); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Stale creation accepted'; end if;
 updated:=public.save_coach_preferences(jsonb_build_object('focus','strength','goal','','coaching_style','concise','expected_updated_at',saved->>'updated_at'));
 if updated->>'focus'<>'strength' or updated->>'setup_completed_at'<>saved->>'setup_completed_at' then raise exception 'Preferences edit lost setup date'; end if;
 rejected:=false; begin update public.coach_preferences set goal='Bypass'; exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Direct update allowed'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000044","role":"authenticated"}',true);
 if exists(select 1 from public.coach_preferences) then raise exception 'Foreign preferences visible'; end if;
 perform public.save_coach_preferences('{"athlete_id":"00000000-0000-4000-8000-000000000043","focus":"gymnastics","goal":"","coaching_style":"balanced","expected_updated_at":null}');
 if not exists(select 1 from public.coach_preferences where athlete_id=auth.uid()) then raise exception 'Owner identity spoofed'; end if;
 rejected:=false; begin perform public.save_coach_preferences('{"focus":"invalid","goal":"","coaching_style":"balanced","expected_updated_at":null}'); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Invalid focus accepted'; end if;
end $$;
reset role;
rollback;
select 'Coach preferences ownership, validation and stale-write checks passed; fixtures rolled back' as result;
