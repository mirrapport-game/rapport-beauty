create type public.app_role as enum ('player', 'leader', 'admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

create policy "roles read own or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "roles admin insert" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "roles admin delete" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') and not (user_id = auth.uid() and role = 'admin'));

alter table public.profiles add column avatar_url text, add column city text, add column clinic text,
  add column updated_at timestamptz not null default now();

drop policy "profiles read" on public.profiles;
create policy "profiles read own admin or co-player" on public.profiles for select to authenticated using (
  id = auth.uid() or public.has_role(auth.uid(), 'admin')
  or exists (select 1 from public.session_participants p join public.game_sessions g on g.id = p.session_id
             where p.user_id = profiles.id and g.leader_id = auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict do nothing;
  select not exists(select 1 from public.user_roles where role = 'admin') into first_user;
  insert into public.user_roles(user_id, role) values (new.id, 'player') on conflict do nothing;
  if first_user then
    insert into public.user_roles(user_id, role) values (new.id, 'admin'), (new.id, 'leader') on conflict do nothing;
  end if;
  return new;
end $$;

insert into public.user_roles(user_id, role) select id, 'player' from auth.users on conflict do nothing;
insert into public.user_roles(user_id, role)
  select u.id, r.role from (select id from auth.users order by created_at limit 1) u
  cross join (values ('admin'::public.app_role), ('leader'::public.app_role)) r(role) on conflict do nothing;

create or replace function public.create_game_session(_title text, _rubric int) returns uuid language plpgsql security definer set search_path = public as $$
declare c text; sid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not (public.has_role(auth.uid(), 'leader') or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Создавать сессии может только ведущий';
  end if;
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists(select 1 from game_sessions where code=c);
  end loop;
  insert into game_sessions(code,title,leader_id,rubric_no) values (c,_title,auth.uid(),_rubric) returning id into sid;
  return sid;
end $$;

create or replace function public.admin_list_users() returns table(id uuid, display_name text, email text, clinic text, roles text[], created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, u.email::text, p.clinic,
    coalesce(array(select r.role::text from user_roles r where r.user_id = p.id order by r.role), '{}'), p.created_at
  from profiles p join auth.users u on u.id = p.id
  where public.has_role(auth.uid(), 'admin')
  order by p.created_at
$$;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;