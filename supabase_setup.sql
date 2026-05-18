-- =============================================
-- TERLAI SYSTEM — Setup completo do banco
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- 1. Tabela profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Tabela receipts
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  file_url text not null,
  file_type text not null default '',
  amount numeric(12,2) not null default 0,
  deposit_date date not null,
  bank text not null default '',
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- 3. Tabela dynamics_cards
create table if not exists dynamics_cards (
  id uuid primary key default gen_random_uuid(),
  board text not null default 'board1' check (board in ('board1', 'board2')),
  column_id text not null,
  title text not null,
  description text not null default '',
  category text not null default '',
  attachment_url text,
  attachment_name text,
  attachment_type text,
  position integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. Tabela weekly_planner
create table if not exists weekly_planner (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references dynamics_cards(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('SEG','TER','QUA','QUI','SEX','SAB','DOM')),
  position integer not null default 0,
  scheduled_date date,
  created_at timestamptz not null default now()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

alter table profiles enable row level security;
alter table receipts enable row level security;
alter table dynamics_cards enable row level security;
alter table weekly_planner enable row level security;

-- Helper: pega role do usuário atual
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Profiles
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or get_my_role() = 'admin');

create policy "profiles_insert" on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update" on profiles for update
  using (auth.uid() = id or get_my_role() = 'admin');

-- Receipts
create policy "receipts_select" on receipts for select
  using (auth.uid() = user_id or get_my_role() = 'admin');

create policy "receipts_insert" on receipts for insert
  with check (auth.uid() = user_id);

create policy "receipts_update" on receipts for update
  using (auth.uid() = user_id or get_my_role() = 'admin');

create policy "receipts_delete" on receipts for delete
  using (auth.uid() = user_id or get_my_role() = 'admin');

-- Dynamics cards (todos autenticados podem ler/escrever)
create policy "dynamics_select" on dynamics_cards for select
  using (auth.uid() is not null);

create policy "dynamics_insert" on dynamics_cards for insert
  with check (auth.uid() is not null);

create policy "dynamics_update" on dynamics_cards for update
  using (auth.uid() is not null);

create policy "dynamics_delete" on dynamics_cards for delete
  using (auth.uid() = created_by or get_my_role() = 'admin');

-- Weekly planner
create policy "weekly_select" on weekly_planner for select
  using (auth.uid() is not null);

create policy "weekly_insert" on weekly_planner for insert
  with check (auth.uid() is not null);

create policy "weekly_update" on weekly_planner for update
  using (auth.uid() is not null);

create policy "weekly_delete" on weekly_planner for delete
  using (auth.uid() is not null);

-- =============================================
-- Storage Buckets
-- =============================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('dynamics-attachments', 'dynamics-attachments', true)
on conflict (id) do nothing;

-- Storage policies — receipts
create policy "receipts_storage_select" on storage.objects for select
  using (bucket_id = 'receipts');

create policy "receipts_storage_insert" on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.uid() is not null);

create policy "receipts_storage_delete" on storage.objects for delete
  using (bucket_id = 'receipts' and auth.uid() is not null);

-- Storage policies — dynamics-attachments
create policy "dynamics_storage_select" on storage.objects for select
  using (bucket_id = 'dynamics-attachments');

create policy "dynamics_storage_insert" on storage.objects for insert
  with check (bucket_id = 'dynamics-attachments' and auth.uid() is not null);

create policy "dynamics_storage_delete" on storage.objects for delete
  using (bucket_id = 'dynamics-attachments' and auth.uid() is not null);

-- =============================================
-- Trigger: criar profile ao registrar
-- =============================================

create or replace function handle_new_user()
returns trigger as $$
declare
  user_count int;
  user_role text;
begin
  select count(*) into user_count from profiles;
  if user_count = 0 then
    user_role := 'admin';
  else
    user_role := 'vendedor';
  end if;

  insert into profiles (id, full_name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    user_role,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
