-- ============================================================
-- TERLAI CRM — Multi-tenancy de Projetos (Arquivo 4 de 4)
-- Execute APÓS supabase_setup.sql, supabase_fix_trigger.sql e supabase_planilhas.sql
-- Seguro para re-rodar: usa IF NOT EXISTS / DROP IF EXISTS / ALTER ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── Tabela projects ──────────────────────────────────────────

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  slug         text not null unique,
  invite_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at   timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select using (
  -- vendedor vê só o próprio projeto, admin vê todos
  id = (select project_id from public.profiles where id = auth.uid())
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  -- e também: permitir leitura via invite_token na página pública (RLS bypass via anon não-autenticado)
  or auth.uid() is null
);

drop policy if exists "projects_admin_all" on public.projects;
create policy "projects_admin_all" on public.projects for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── project_id nas tabelas existentes ─────────────────────────

alter table public.profiles         add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.receipts         add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.dynamics_cards   add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.weekly_planner   add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.sheets           add column if not exists project_id uuid references public.projects(id) on delete set null;

-- ── Seed: projetos iniciais ──────────────────────────────────

insert into public.projects (name, slug) values
  ('NovaDexy', 'novadexy'),
  ('Profitx',  'profitx')
on conflict (name) do nothing;

-- ── Migração: atribuir dados existentes ao primeiro projeto ──

update public.receipts       set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;
update public.dynamics_cards set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;
update public.weekly_planner set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;
update public.sheets         set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;

-- ── Atualizar trigger handle_new_user para gravar project_id dos metadados ──

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, active, project_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    'vendedor',
    false,  -- aguarda aprovação do admin
    nullif(new.raw_user_meta_data->>'project_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ── RLS atualizada: isolamento por projeto ────────────────────

drop policy if exists "receipts_select" on public.receipts;
create policy "receipts_select" on public.receipts for select using (
  project_id = (select project_id from public.profiles where id = auth.uid())
  and (auth.uid() = user_id or public.get_my_role() = 'admin')
  or public.get_my_role() = 'admin'
);

drop policy if exists "dynamics_select" on public.dynamics_cards;
create policy "dynamics_select" on public.dynamics_cards for select using (
  project_id = (select project_id from public.profiles where id = auth.uid())
  or public.get_my_role() = 'admin'
);

drop policy if exists "weekly_select" on public.weekly_planner;
create policy "weekly_select" on public.weekly_planner for select using (
  project_id = (select project_id from public.profiles where id = auth.uid())
  or public.get_my_role() = 'admin'
);

-- ── Pronto. Cheque com: select * from projects; ───────────────
