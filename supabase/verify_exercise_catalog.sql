-- Read-only verification for the shared bilingual catalog.
select 'Shared exercise catalog' as check_name,count(*)::text as actual,'1379' as expected from public.exercises where athlete_id is null
union all select 'Imported dataset exercises',count(*)::text,'1324' from public.exercises where athlete_id is null and source='exercises-dataset'
union all select 'Added core movements',count(*)::text,'55' from public.exercises where athlete_id is null and source='athleteos-core'
union all select 'English + Spanish names and instructions',count(*)::text,'1379' from public.exercises where athlete_id is null and name<>'' and name_es<>'' and coalesce(instructions->>'en','')<>'' and coalesce(instructions->>'es','')<>''
union all select 'Callable private helper functions',count(*)::text,'0' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('check_exercise_reference','save_training_session_internal','complete_training_session_internal') and has_function_privilege('authenticated',p.oid,'execute')
union all select 'Temporary catalog test accounts',count(*)::text,'0' from auth.users where id in ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042');
