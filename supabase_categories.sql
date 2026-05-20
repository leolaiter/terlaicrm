-- ============================================================
-- TERLAI CRM — Categorias customizáveis de Dinâmicas (Arquivo 5)
-- Execute APÓS supabase_projects.sql
-- ============================================================

-- ── Tabela dynamics_categories ───────────────────────────────

create table if not exists public.dynamics_categories (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  slug        text not null,
  name        text not null,
  color       text not null default '#3B82F6',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (project_id, slug)
);

alter table public.dynamics_categories enable row level security;

drop policy if exists "categories_select" on public.dynamics_categories;
create policy "categories_select" on public.dynamics_categories for select using (
  project_id = (select project_id from public.profiles where id = auth.uid())
  or public.get_my_role() = 'admin'
);

drop policy if exists "categories_admin_all" on public.dynamics_categories;
create policy "categories_admin_all" on public.dynamics_categories for all using (
  public.get_my_role() = 'admin'
);

-- Vendedores também podem criar (mas só no próprio projeto)
drop policy if exists "categories_insert_member" on public.dynamics_categories;
create policy "categories_insert_member" on public.dynamics_categories for insert with check (
  project_id = (select project_id from public.profiles where id = auth.uid())
);

drop policy if exists "categories_delete_member" on public.dynamics_categories;
create policy "categories_delete_member" on public.dynamics_categories for delete using (
  project_id = (select project_id from public.profiles where id = auth.uid())
  or public.get_my_role() = 'admin'
);

drop policy if exists "categories_update_member" on public.dynamics_categories;
create policy "categories_update_member" on public.dynamics_categories for update using (
  project_id = (select project_id from public.profiles where id = auth.uid())
  or public.get_my_role() = 'admin'
);

-- ── Seed: criar 4 categorias padrão para CADA projeto existente ──

insert into public.dynamics_categories (project_id, slug, name, color, position)
select p.id, c.slug, c.name, c.color, c.position
from public.projects p
cross join (values
  ('alavancagem', 'Alavancagem de Capital', '#3B82F6', 0),
  ('recuperacao', 'Recuperação de Capital', '#F97316', 1),
  ('entrada',     'Entrada Assertiva',       '#22C55E', 2),
  ('disparos',    'Disparos',                '#EAB308', 3)
) as c(slug, name, color, position)
on conflict (project_id, slug) do nothing;

-- ── Pronto. Cheque com:
--   select project_id, slug, name, color from public.dynamics_categories order by project_id, position;
