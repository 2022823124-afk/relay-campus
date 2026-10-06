-- Account snapshots are private. All access goes through the authenticated backend.
create table if not exists public.account_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.account_states enable row level security;
revoke all on public.account_states from anon, authenticated;
grant select, insert, update, delete on public.account_states to service_role;
create or replace function public.touch_account_state() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists touch_account_state on public.account_states;
create trigger touch_account_state before update on public.account_states
for each row execute function public.touch_account_state();
