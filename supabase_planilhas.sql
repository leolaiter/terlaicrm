-- ============================================================
-- TERLAI CRM — Planilhas (Arquivo 3 de 3)
-- Execute POR ÚLTIMO, após supabase_setup.sql
-- Seguro para re-rodar: usa IF NOT EXISTS e DROP IF EXISTS
-- ============================================================

-- ── sheets ───────────────────────────────────────────────────

create table if not exists public.sheets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null default 'Nova Planilha',
  created_at timestamptz not null default now()
);
alter table public.sheets enable row level security;

drop policy if exists "sheets_owner_or_admin" on public.sheets;
create policy "sheets_owner_or_admin" on public.sheets for all using (
  auth.uid() = user_id or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── sheet_columns ─────────────────────────────────────────────

create table if not exists public.sheet_columns (
  id       uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.sheets(id) on delete cascade,
  name     text not null default 'Coluna',
  type     text not null default 'text',
  position int  not null default 0
);
alter table public.sheet_columns enable row level security;

drop policy if exists "sheet_columns_via_sheet" on public.sheet_columns;
create policy "sheet_columns_via_sheet" on public.sheet_columns for all using (
  exists (
    select 1 from public.sheets s
    where s.id = sheet_id and (
      s.user_id = auth.uid() or
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  )
);

-- ── sheet_rows ────────────────────────────────────────────────

create table if not exists public.sheet_rows (
  id         uuid primary key default gen_random_uuid(),
  sheet_id   uuid not null references public.sheets(id) on delete cascade,
  data       jsonb not null default '{}',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.sheet_rows enable row level security;

drop policy if exists "sheet_rows_via_sheet" on public.sheet_rows;
create policy "sheet_rows_via_sheet" on public.sheet_rows for all using (
  exists (
    select 1 from public.sheets s
    where s.id = sheet_id and (
      s.user_id = auth.uid() or
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  )
);
