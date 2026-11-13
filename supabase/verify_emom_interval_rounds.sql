-- Read-only hosted verification after 202611140002.
select 'EMOM interval column' as check_name,count(*)::text as actual,'1' as expected
from information_schema.columns where table_schema='public' and table_name='workout_sections' and column_name='emom_interval_seconds' and data_type='integer'
union all select 'EMOM timing missing',count(*)::text,'0' from public.workout_sections
where format='emom' and (emom_interval_seconds is null or interval_rounds is null)
union all select 'EMOM round-length validator',count(*)::text,'1' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='save_workout_section' and p.prosrc like '%EMOM prescribed round count mismatch%'
union all select 'EMOM total-duration validator',count(*)::text,'1' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='save_training_session_internal' and p.prosrc like '%EMOM total duration exceeds 24 hours%'
union all select 'Private session writer exposed',count(*)::text,'0' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='save_training_session_internal' and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))
union all select 'Temporary EMOM test users',count(*)::text,'0' from auth.users where id='00000000-0000-4000-8000-000000000042';
