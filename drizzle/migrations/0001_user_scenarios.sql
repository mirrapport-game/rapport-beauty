create table public.user_scenarios (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid(),
  author_name text not null default '',
  rubric_no int not null,
  rubric text not null,
  title text not null,
  situation text not null,
  dialogue jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.user_scenarios to authenticated;
grant all on public.user_scenarios to service_role;
alter table public.user_scenarios enable row level security;
create policy "scenarios read" on public.user_scenarios for select to authenticated using (true);
create policy "scenarios insert own" on public.user_scenarios for insert to authenticated with check (author_id = auth.uid());
create policy "scenarios delete own" on public.user_scenarios for delete to authenticated using (author_id = auth.uid());

create table public.user_scenario_solutions (
  scenario_id uuid primary key references public.user_scenarios(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  task text not null,
  solution text not null
);
grant select, insert on public.user_scenario_solutions to authenticated;
grant all on public.user_scenario_solutions to service_role;
alter table public.user_scenario_solutions enable row level security;
create policy "solutions read own" on public.user_scenario_solutions for select to authenticated using (author_id = auth.uid());
create policy "solutions insert own" on public.user_scenario_solutions for insert to authenticated with check (author_id = auth.uid());

create or replace function public.get_user_solution(_card text) returns table(task text, solution text) language sql stable security definer set search_path = public as $$
  select s.task, s.solution from user_scenario_solutions s where s.scenario_id::text = _card
$$;
revoke execute on function public.get_user_solution(text) from public, anon, authenticated;
grant execute on function public.get_user_solution(text) to service_role;