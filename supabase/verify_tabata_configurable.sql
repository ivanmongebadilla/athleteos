-- Read-only verification after 202611140001_tabata_configurable.sql.
select 'tabata_work_seconds column' as check_name, count(*)::text as actual, '1' as expected
from information_schema.columns where table_schema='public' and table_name='workout_sections' and column_name='tabata_work_seconds' and data_type='integer'
union all select 'tabata_rest_seconds column',count(*)::text,'1'
from information_schema.columns where table_schema='public' and table_name='workout_sections' and column_name='tabata_rest_seconds' and data_type='integer'
union all select 'Existing Tabata with 20s work / 10s rest',count(*)::text,'at least 1'
from public.workout_sections where format='tabata' and tabata_work_seconds=20 and tabata_rest_seconds=10
union all select 'Obsolete eight-round constraint',count(*)::text,'0'
from pg_constraint where conrelid='public.workout_sections'::regclass and conname='sections_tabata_eight_rounds'
union all select 'Temporary Tabata test users',count(*)::text,'0'
from auth.users where id='00000000-0000-4000-8000-000000000041';
