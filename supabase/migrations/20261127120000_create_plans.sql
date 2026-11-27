-- One financial plan JSON document per authenticated user.
create table if not exists public.plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "plans_select_own" on public.plans
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "plans_insert_own" on public.plans
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "plans_update_own" on public.plans
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.plans to authenticated;