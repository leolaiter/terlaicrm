-- ============================================================
-- TERLAI CRM — Multi-tenancy de Projetos (Arquivo 4 de 4)
-- Execute APÓS supabase_setup.sql, supabase_fix_trigger.sql e supabase_planilhas.sql
-- Seguro para re-rodar
-- ============================================================

-- ── PASSO 1: adicionar project_id nas tabelas existentes ─────
-- (precisa vir antes de criar policies que referenciam essa coluna)

alter table public.profiles         add column if not exists project_id uuid;
alter table public.receipts         add column if not exists project_id uuid;
alter table public.dynamics_cards   add column if not exists project_id uuid;
alter table public.weekly_planner   add column if not exists project_id uuid;
alter table public.sheets           add column if not exists project_id uuid;

-- ── PASSO 2: criar tabela projects ───────────────────────────

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  slug         text not null unique,
  invite_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at   timestamptz not null default now()
);

-- ── PASSO 3: foreign keys (agora que projects existe) ────────

do $$ begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'profiles_project_id_fkey') then
    alter table public.profiles         add constraint profiles_project_id_fkey         foreign key (project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'receipts_project_id_fkey') then
    alter table public.receipts         add constraint receipts_project_id_fkey         foreign key (project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'dynamics_cards_project_id_fkey') then
    alter table public.dynamics_cards   add constraint dynamics_cards_project_id_fkey   foreign key (project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'weekly_planner_project_id_fkey') then
    alter table public.weekly_planner   add constraint weekly_planner_project_id_fkey   foreign key (project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'sheets_project_id_fkey') then
    alter table public.sheets           add constraint sheets_project_id_fkey           foreign key (project_id) references public.projects(id) on delete set null;
  end if;
end $$;

-- ── PASSO 4: RLS na tabela projects ──────────────────────────

alter table public.projects enable row level security;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select using (
  id = (select project_id from public.profiles where id = auth.uid())
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or auth.uid() is null  -- permite leitura da página pública de convite
);

drop policy if exists "projects_admin_all" on public.projects;
create policy "projects_admin_all" on public.projects for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── PASSO 5: seed dos projetos iniciais ──────────────────────

insert into public.projects (name, slug) values
  ('NovaDexy', 'novadexy'),
  ('Profitx',  'profitx')
on conflict (name) do nothing;

-- ── PASSO 6: migrar dados existentes para o NovaDexy ─────────

update public.receipts       set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;
update public.dynamics_cards set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;
update public.weekly_planner set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;
update public.sheets         set project_id = (select id from public.projects where slug = 'novadexy') where project_id is null;

-- ── PASSO 7: trigger handle_new_user grava project_id ────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, active, project_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    'vendedor',
    false,
    nullif(new.raw_user_meta_data->>'project_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ── PASSO 8: RLS atualizada com isolamento por projeto ───────

drop policy if exists "receipts_select" on public.receipts;
create policy "receipts_select" on public.receipts for select using (
  public.get_my_role() = 'admin'
  or (project_id = (select project_id from public.profiles where id = auth.uid()) and auth.uid() = user_id)
);

drop policy if exists "dynamics_select" on public.dynamics_cards;
create policy "dynamics_select" on public.dynamics_cards for select using (
  public.get_my_role() = 'admin'
  or project_id = (select project_id from public.profiles where id = auth.uid())
);

-- ── PRONTO. Cheque com:
--   select * from public.projects;
--   select id, full_name, project_id from public.profiles;
