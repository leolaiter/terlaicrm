-- ============================================================
-- TERLAI SYSTEM — Setup completo do banco (Arquivo 1 de 3)
-- Execute primeiro no Supabase Dashboard > SQL Editor
-- Seguro para re-rodar: usa IF NOT EXISTS e DROP IF EXISTS
-- ============================================================

-- ── Tabelas ──────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  email      text not null default '',
  role       text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  file_url     text not null,
  file_type    text not null default '',
  amount       numeric(12,2) not null default 0,
  deposit_date date not null,
  bank         text not null default '',
  notes        text not null default '',
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);

create table if not exists public.dynamics_cards (
  id              uuid primary key default gen_random_uuid(),
  board           text not null default 'board1' check (board in ('board1', 'board2')),
  column_id       text not null,
  title           text not null,
  description     text not null default '',
  category        text not null default '',
  attachment_url  text,
  attachment_name text,
  attachment_type text,
  position        integer not null default 0,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.weekly_planner (
  id             uuid primary key default gen_random_uuid(),
  card_id        uuid not null references public.dynamics_cards(id) on delete cascade,
  day_of_week    text not null check (day_of_week in ('SEG','TER','QUA','QUI','SEX','SAB','DOM')),
  position       integer not null default 0,
  scheduled_date date,
  created_at     timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.receipts       enable row level security;
alter table public.dynamics_cards enable row level security;
alter table public.weekly_planner enable row level security;

-- Helper
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or public.get_my_role() = 'admin');

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id or public.get_my_role() = 'admin');

-- receipts
drop policy if exists "receipts_select" on public.receipts;
create policy "receipts_select" on public.receipts for select
  using (auth.uid() = user_id or public.get_my_role() = 'admin');

drop policy if exists "receipts_insert" on public.receipts;
create policy "receipts_insert" on public.receipts for insert
  with check (auth.uid() = user_id);

drop policy if exists "receipts_update" on public.receipts;
create policy "receipts_update" on public.receipts for update
  using (auth.uid() = user_id or public.get_my_role() = 'admin');

drop policy if exists "receipts_delete" on public.receipts;
create policy "receipts_delete" on public.receipts for delete
  using (auth.uid() = user_id or public.get_my_role() = 'admin');

-- dynamics_cards
drop policy if exists "dynamics_select" on public.dynamics_cards;
create policy "dynamics_select" on public.dynamics_cards for select
  using (auth.uid() is not null);

drop policy if exists "dynamics_insert" on public.dynamics_cards;
create policy "dynamics_insert" on public.dynamics_cards for insert
  with check (auth.uid() is not null);

drop policy if exists "dynamics_update" on public.dynamics_cards;
create policy "dynamics_update" on public.dynamics_cards for update
  using (auth.uid() is not null);

drop policy if exists "dynamics_delete" on public.dynamics_cards;
create policy "dynamics_delete" on public.dynamics_cards for delete
  using (auth.uid() = created_by or public.get_my_role() = 'admin');

-- weekly_planner
drop policy if exists "weekly_select" on public.weekly_planner;
create policy "weekly_select" on public.weekly_planner for select
  using (auth.uid() is not null);

drop policy if exists "weekly_insert" on public.weekly_planner;
create policy "weekly_insert" on public.weekly_planner for insert
  with check (auth.uid() is not null);

drop policy if exists "weekly_update" on public.weekly_planner;
create policy "weekly_update" on public.weekly_planner for update
  using (auth.uid() is not null);

drop policy if exists "weekly_delete" on public.weekly_planner;
create policy "weekly_delete" on public.weekly_planner for delete
  using (auth.uid() is not null);

-- ── Storage ───────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('dynamics-attachments', 'dynamics-attachments', true)
on conflict (id) do nothing;

drop policy if exists "receipts_storage_select" on storage.objects;
create policy "receipts_storage_select" on storage.objects for select
  using (bucket_id = 'receipts');

drop policy if exists "receipts_storage_insert" on storage.objects;
create policy "receipts_storage_insert" on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.uid() is not null);

drop policy if exists "receipts_storage_delete" on storage.objects;
create policy "receipts_storage_delete" on storage.objects for delete
  using (bucket_id = 'receipts' and auth.uid() is not null);

drop policy if exists "dynamics_storage_select" on storage.objects;
create policy "dynamics_storage_select" on storage.objects for select
  using (bucket_id = 'dynamics-attachments');

drop policy if exists "dynamics_storage_insert" on storage.objects;
create policy "dynamics_storage_insert" on storage.objects for insert
  with check (bucket_id = 'dynamics-attachments' and auth.uid() is not null);

drop policy if exists "dynamics_storage_delete" on storage.objects;
create policy "dynamics_storage_delete" on storage.objects for delete
  using (bucket_id = 'dynamics-attachments' and auth.uid() is not null);

-- ── Trigger: cria profile ao registrar ───────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_role  text;
begin
  select count(*) into v_count from public.profiles;

  if v_count = 0 then
    v_role := 'admin';
  else
    v_role := 'vendedor';
  end if;

  insert into public.profiles (id, full_name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    v_role,
    true
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email     = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
