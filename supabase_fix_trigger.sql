-- ============================================================
-- TERLAI SYSTEM — Correção do trigger (Arquivo 2 de 3)
-- Execute APÓS supabase_setup.sql
-- Seguro para re-rodar: usa DROP IF EXISTS antes de recriar
-- ============================================================

-- Remove versão anterior
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Recria com search_path correto
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
  for each row
  execute function public.handle_new_user();
