-- Logging and deletion lock the same session row. Recheck results under that
-- lock so an old calendar or an in-flight log cannot bypass this restriction.
begin;
create or replace function public.delete_training_session(payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); row_session public.training_sessions;
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(payload) is distinct from 'object' or payload->>'expected_updated_at' is null then raise exception 'Session version required'; end if;
 select * into row_session from public.training_sessions where id=(payload->>'id')::uuid and athlete_id=owner_id for update;
 if not found then raise exception 'Session unavailable'; end if;
 if row_session.status='completed' or exists(select 1 from public.workout_results where session_id=row_session.id) then
   raise exception 'Completed sessions and sessions with logged results cannot be deleted';
 end if;
 if row_session.deleted_at is not null then return row_session.id; end if;
 if row_session.updated_at<>(payload->>'expected_updated_at')::timestamptz then raise exception 'Session changed; reload before deleting'; end if;
 update public.training_sessions set deleted_at=clock_timestamp() where id=row_session.id;
 return row_session.id;
end; $$;
revoke all on function public.delete_training_session(jsonb) from public,anon;
grant execute on function public.delete_training_session(jsonb) to authenticated;
commit;
