-- Read-only checks for the initial empty AthleteOS project.
select 'Application tables' as check_name,
       count(*)::text as actual,
       '17' as expected
from pg_tables where schemaname = 'public'
union all
select 'Tables with RLS', count(*)::text, '17'
from pg_tables where schemaname = 'public' and rowsecurity
union all
select 'Application columns', count(*)::text, '165'
from information_schema.columns where table_schema = 'public'
union all
select 'Signup profile trigger', count(*)::text, '1'
from pg_trigger
where tgname = 'on_auth_user_created'
  and tgrelid = 'auth.users'::regclass and not tgisinternal
union all
select 'Temporary test accounts', count(*)::text, '0'
from auth.users
where id in ('00000000-0000-4000-8000-000000000001',
             '00000000-0000-4000-8000-000000000002');
