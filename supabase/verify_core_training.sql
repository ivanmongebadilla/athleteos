select 'Public tables with RLS' as check_name, count(*)::text as actual, '18' as expected from pg_tables where schemaname='public' and rowsecurity
union all select 'Application columns',count(*)::text,'190' from information_schema.columns where table_schema='public'
union all select 'Training/profile API functions',count(*)::text,'7' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_athlete_profile','save_training_session','complete_training_session','save_workout_section','delete_training_session','restore_training_session','save_coach_preferences') and p.prosecdef
union all select 'Internal functions callable by authenticated',count(*)::text,'0' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_training_session_internal','complete_training_session_internal','check_exercise_reference') and has_function_privilege('authenticated',p.oid,'execute')
union all select 'Temporary Phase 2 accounts',count(*)::text,'0' from auth.users where id in ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012')
union all select 'Temporary logging accounts',count(*)::text,'0' from auth.users where id in ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000032')
union all select 'Shared exercises',count(*)::text,'1379' from public.exercises where athlete_id is null
union all select 'Dataset exercises',count(*)::text,'1324' from public.exercises where athlete_id is null and source='exercises-dataset'
union all select 'Added core movements',count(*)::text,'55' from public.exercises where athlete_id is null and source='athleteos-core'
union all select 'Incomplete bilingual exercises',count(*)::text,'0' from public.exercises where athlete_id is null and (name_es is null or coalesce(instructions->>'en','')='' or coalesce(instructions->>'es','')='')
union all select 'Temporary catalog accounts',count(*)::text,'0' from auth.users where id in ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042')
union all select 'Temporary deletion accounts',count(*)::text,'0' from auth.users where id in ('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000052');
