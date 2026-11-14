create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  leader_id uuid not null,
  rubric_no int,
  stage int not null default 0,
  turn_no int not null default 0,
  current_participant uuid,
  current_card_id text,
  turn_role text,
  current_skill_id text,
  timer_started_at timestamptz,
  timer_duration int not null default 180,
  timer_remaining int,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create or replace function public.is_session_leader(_sid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from game_sessions where id=_sid and leader_id=auth.uid()) $$;
create or replace function public.is_session_member(_sid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from game_sessions where id=_sid and leader_id=auth.uid())
   or exists(select 1 from session_participants where session_id=_sid and user_id=auth.uid()) $$;

grant select (id, code, title, leader_id, rubric_no, stage, turn_no, current_participant, current_card_id, turn_role, timer_started_at, timer_duration, timer_remaining, status, created_at) on public.game_sessions to authenticated;
grant insert, update, delete on public.game_sessions to authenticated;
grant all on public.game_sessions to service_role;
alter table public.game_sessions enable row level security;
create policy "sessions read members" on public.game_sessions for select to authenticated using (public.is_session_member(id));
create policy "sessions insert leader" on public.game_sessions for insert to authenticated with check (leader_id = auth.uid());
create policy "sessions update leader" on public.game_sessions for update to authenticated using (leader_id = auth.uid());
create policy "sessions delete leader" on public.game_sessions for delete to authenticated using (leader_id = auth.uid());

grant select, delete on public.session_participants to authenticated;
grant all on public.session_participants to service_role;
alter table public.session_participants enable row level security;
create policy "participants read members" on public.session_participants for select to authenticated using (public.is_session_member(session_id));
create policy "participants delete leader or self" on public.session_participants for delete to authenticated using (public.is_session_leader(session_id) or user_id = auth.uid());

create table public.turn_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  participant_id uuid,
  card_id text,
  action text not null,
  actor uuid not null default auth.uid(),
  at timestamptz not null default now()
);
grant select, insert on public.turn_log to authenticated;
grant all on public.turn_log to service_role;
alter table public.turn_log enable row level security;
create policy "log read leader" on public.turn_log for select to authenticated using (public.is_session_leader(session_id));
create policy "log insert leader" on public.turn_log for insert to authenticated with check (public.is_session_leader(session_id));

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  turn_no int not null,
  to_participant uuid not null,
  from_user uuid not null default auth.uid(),
  from_name text not null default '',
  score_contact int, score_empathy int, score_solution int,
  good text, improve text,
  created_at timestamptz not null default now()
);
grant select, insert on public.feedback to authenticated;
grant all on public.feedback to service_role;
alter table public.feedback enable row level security;
create policy "feedback read" on public.feedback for select to authenticated using (
  public.is_session_leader(session_id) or from_user = auth.uid()
  or exists(select 1 from session_participants p where p.id = to_participant and p.user_id = auth.uid()));
create policy "feedback insert" on public.feedback for insert to authenticated with check (public.is_session_member(session_id) and from_user = auth.uid());

create or replace function public.create_game_session(_title text, _rubric int) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare c text; sid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists(select 1 from game_sessions where code=c);
  end loop;
  insert into game_sessions(code,title,leader_id,rubric_no) values (c,_title,auth.uid(),_rubric) returning id into sid;
  return sid;
end $$;

create or replace function public.join_game_session(_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; n text; cnt int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into sid from game_sessions where code = upper(trim(_code)) and status='active';
  if sid is null then raise exception 'Сессия не найдена'; end if;
  if exists(select 1 from game_sessions where id=sid and leader_id=auth.uid()) then return sid; end if;
  select count(*) into cnt from session_participants where session_id=sid;
  if cnt >= 20 and not exists(select 1 from session_participants where session_id=sid and user_id=auth.uid()) then raise exception 'Сессия заполнена (20)'; end if;
  select coalesce(nullif(display_name,''),'Игрок') into n from profiles where id=auth.uid();
  insert into session_participants(session_id,user_id,display_name) values (sid,auth.uid(),coalesce(n,'Игрок')) on conflict do nothing;
  return sid;
end $$;

create or replace function public.get_turn_skill(_sid uuid) returns text language sql stable security definer set search_path = public as $$
  select s.current_skill_id from game_sessions s
  where s.id=_sid and (s.leader_id=auth.uid() or (s.stage>=4 and exists(
    select 1 from session_participants p where p.id=s.current_participant and p.user_id=auth.uid())))
$$;
create or replace function public.solution_access(_sid uuid) returns text language sql stable security definer set search_path = public as $$
  select s.current_card_id from game_sessions s
  where s.id=_sid and (s.leader_id=auth.uid() or (s.stage>=6 and exists(
    select 1 from session_participants p where p.id=s.current_participant and p.user_id=auth.uid())))
$$;
create or replace function public.set_turn_skill(_sid uuid, _skill text) returns void language sql security definer set search_path = public as $$
  update game_sessions set current_skill_id=_skill where id=_sid and leader_id=auth.uid()
$$;

revoke execute on function public.create_game_session(text,int), public.join_game_session(text), public.get_turn_skill(uuid), public.solution_access(uuid), public.set_turn_skill(uuid,text) from public, anon;
grant execute on function public.create_game_session(text,int), public.join_game_session(text), public.get_turn_skill(uuid), public.solution_access(uuid), public.set_turn_skill(uuid,text), public.is_session_member(uuid), public.is_session_leader(uuid) to authenticated;

alter publication supabase_realtime add table public.game_sessions, public.session_participants, public.feedback;