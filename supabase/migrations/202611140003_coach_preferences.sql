begin;
create table public.coach_preferences (
  athlete_id uuid primary key references public.profiles(id) on delete restrict,
  focus text not null check (focus in ('balanced','weightlifting','strength','conditioning','gymnastics')),
  goal text not null default '' check (length(goal)<=1000),
  coaching_style text not null check (coaching_style in ('concise','detailed','balanced')),
  setup_completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coach_preferences enable row level security;
revoke all on public.coach_preferences from anon,authenticated;
grant select on public.coach_preferences to authenticated;
create policy coach_preferences_select_own on public.coach_preferences for select to authenticated using (athlete_id=auth.uid());
create function public.save_coach_preferences(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); existing public.coach_preferences; saved public.coach_preferences;
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(payload) is distinct from 'object' or payload->>'focus' is null or payload->>'coaching_style' is null
   or payload->>'focus' not in ('balanced','weightlifting','strength','conditioning','gymnastics')
   or payload->>'coaching_style' not in ('concise','detailed','balanced')
   or jsonb_typeof(payload->'goal') is distinct from 'string' or length(payload->>'goal')>1000
   or not (payload ? 'expected_updated_at') then raise exception 'Invalid coach preferences'; end if;
 -- Serialize first-time creation as well as edits, without trusting an athlete ID in payload.
 perform 1 from public.profiles where id=owner_id for update;
 if not found then raise exception 'Athlete unavailable'; end if;
 select * into existing from public.coach_preferences where athlete_id=owner_id for update;
 if found then
   if payload->>'expected_updated_at' is null or existing.updated_at is distinct from (payload->>'expected_updated_at')::timestamptz then raise exception 'Coach preferences changed; reload'; end if;
   update public.coach_preferences set focus=payload->>'focus',goal=trim(payload->>'goal'),coaching_style=payload->>'coaching_style',updated_at=clock_timestamp() where athlete_id=owner_id returning * into saved;
 else
   if payload->>'expected_updated_at' is not null then raise exception 'Coach preferences changed; reload'; end if;
   insert into public.coach_preferences(athlete_id,focus,goal,coaching_style) values(owner_id,payload->>'focus',trim(payload->>'goal'),payload->>'coaching_style') returning * into saved;
 end if;
 return jsonb_build_object('focus',saved.focus,'goal',saved.goal,'coaching_style',saved.coaching_style,'setup_completed_at',saved.setup_completed_at,'updated_at',saved.updated_at);
end $$;
revoke all on function public.save_coach_preferences(jsonb) from public,anon;
grant execute on function public.save_coach_preferences(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
