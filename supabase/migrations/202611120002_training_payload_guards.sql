begin;
-- Reject absent arrays/versions at the RPC boundary as well as in Server Actions.
-- Existing write implementations remain inaccessible to API roles.
alter function public.save_training_session(jsonb) rename to save_training_session_internal;
alter function public.complete_training_session(jsonb) rename to complete_training_session_internal;
revoke all on function public.save_training_session_internal(jsonb), public.complete_training_session_internal(jsonb) from public, anon, authenticated;
create function public.save_training_session(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare section jsonb; movement jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'sections') is distinct from 'array' then raise exception 'Sections required'; end if;
  if payload->>'id' is not null and payload->>'expected_updated_at' is null then raise exception 'Version required'; end if;
  for section in select value from jsonb_array_elements(payload->'sections') loop
    if jsonb_typeof(section->'exercises') is distinct from 'array' then raise exception 'Exercises required'; end if;
    for movement in select value from jsonb_array_elements(section->'exercises') loop
      if jsonb_typeof(movement->'sets') is distinct from 'array' then raise exception 'Sets required'; end if;
    end loop;
  end loop;
  return public.save_training_session_internal(payload);
end; $$;
create function public.complete_training_session(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'results') is distinct from 'array' or payload->>'expected_updated_at' is null then raise exception 'Results and version required'; end if;
  if not exists(select 1 from jsonb_array_elements(payload->'results') r where jsonb_array_length(r->'sets') > 0 or r->>'completion_seconds' is not null or r->>'rounds' is not null or r->>'repetitions' is not null or r->>'session_rpe' is not null or length(trim(r->>'notes')) > 0) then raise exception 'Enter an actual result'; end if;
  for result in select value from jsonb_array_elements(payload->'results') loop
    if jsonb_typeof(result->'sets') is distinct from 'array' then raise exception 'Actual sets required'; end if;
  end loop;
  perform public.complete_training_session_internal(payload);
end; $$;
revoke all on function public.save_training_session(jsonb), public.complete_training_session(jsonb) from public, anon;
grant execute on function public.save_training_session(jsonb), public.complete_training_session(jsonb) to authenticated;
commit;
