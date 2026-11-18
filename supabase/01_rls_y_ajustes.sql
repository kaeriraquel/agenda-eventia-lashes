-- =====================================================================
-- Agenda Eventia — Seguridad (RLS) y ajustes de esquema
-- Correr en Supabase > SQL Editor. Se puede correr más de una vez.
-- ANTES: corre el bloque "PASO 0" solo y revisa que no regrese filas.
-- =====================================================================


-- =====================================================================
-- PASO 0 (correr aparte primero): buscar duplicados que impedirían
-- crear los índices únicos. Si regresa filas, hay que limpiarlas antes.
-- =====================================================================
-- select user_id, phone_normalized, count(*)
--   from public.clients
--  where phone_normalized is not null
--  group by 1, 2 having count(*) > 1;
--
-- select user_id, source_local_id, count(*)
--   from public.appointments
--  where source_local_id is not null
--  group by 1, 2 having count(*) > 1;


begin;

-- =====================================================================
-- 1) Índices únicos que usan los upsert de la app
--    (sin ellos Supabase da el error 42P10)
--    Los NULL no chocan entre sí: varias clientas sin teléfono están bien.
-- =====================================================================
create unique index if not exists clients_user_phone_uniq
  on public.clients (user_id, phone_normalized);

create unique index if not exists appointments_user_source_local_uniq
  on public.appointments (user_id, source_local_id);

-- Índices para que las consultas por usuaria sean rápidas
create index if not exists appointments_user_date_idx on public.appointments (user_id, date, time);
create index if not exists appointments_client_idx     on public.appointments (client_id);
create index if not exists services_user_idx           on public.services (user_id);


-- =====================================================================
-- 2) Llaves foráneas
--    - Si se borra la cuenta, se borran sus datos (Google Play exige
--      poder eliminar la cuenta).
--    - Si se borra una clienta, sus citas se quedan pero sin client_id
--      (antes el borrado fallaba si la clienta tenía citas).
-- =====================================================================
alter table public.profiles     drop constraint if exists profiles_id_fkey;
alter table public.profiles     add  constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

alter table public.services     drop constraint if exists services_user_id_fkey;
alter table public.services     add  constraint services_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.clients      drop constraint if exists clients_user_id_fkey;
alter table public.clients      add  constraint clients_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.appointments drop constraint if exists appointments_user_id_fkey;
alter table public.appointments add  constraint appointments_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.appointments drop constraint if exists appointments_client_id_fkey;
alter table public.appointments add  constraint appointments_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;


-- =====================================================================
-- 3) user_id se llena solo con la usuaria de la sesión
--    (la app ya lo manda, esto es por si acaso)
-- =====================================================================
alter table public.services     alter column user_id set default auth.uid();
alter table public.clients      alter column user_id set default auth.uid();
alter table public.appointments alter column user_id set default auth.uid();


-- =====================================================================
-- 4) updated_at automático
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_services_updated_at     on public.services;
drop trigger if exists trg_clients_updated_at      on public.clients;
drop trigger if exists trg_appointments_updated_at on public.appointments;

create trigger trg_services_updated_at     before update on public.services
  for each row execute function public.set_updated_at();
create trigger trg_clients_updated_at      before update on public.clients
  for each row execute function public.set_updated_at();
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 5) Row Level Security: cada usuaria solo ve y toca SUS filas
--    (select auth.uid()) en vez de auth.uid() = más rápido en Postgres
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.services     enable row level security;
alter table public.clients      enable row level security;
alter table public.appointments enable row level security;

-- ---------- profiles (la llave es id = usuaria) ----------
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- ---------- services ----------
drop policy if exists "services_select_own" on public.services;
drop policy if exists "services_insert_own" on public.services;
drop policy if exists "services_update_own" on public.services;
drop policy if exists "services_delete_own" on public.services;

create policy "services_select_own" on public.services
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "services_insert_own" on public.services
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "services_update_own" on public.services
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "services_delete_own" on public.services
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- clients ----------
drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;

create policy "clients_select_own" on public.clients
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "clients_insert_own" on public.clients
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "clients_update_own" on public.clients
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "clients_delete_own" on public.clients
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- appointments ----------
-- Además de ser dueña de la cita, el client_id (si viene) tiene que ser
-- una clienta SUYA: evita ligar una cita a la clienta de otra cuenta.
drop policy if exists "appointments_select_own" on public.appointments;
drop policy if exists "appointments_insert_own" on public.appointments;
drop policy if exists "appointments_update_own" on public.appointments;
drop policy if exists "appointments_delete_own" on public.appointments;

create policy "appointments_select_own" on public.appointments
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "appointments_insert_own" on public.appointments
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (
      client_id is null
      or exists (select 1 from public.clients c
                  where c.id = client_id and c.user_id = (select auth.uid()))
    )
  );

create policy "appointments_update_own" on public.appointments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      client_id is null
      or exists (select 1 from public.clients c
                  where c.id = client_id and c.user_id = (select auth.uid()))
    )
  );

create policy "appointments_delete_own" on public.appointments
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;


-- =====================================================================
-- VERIFICAR (correr después): las 4 tablas deben salir con rls = true
-- y 4 políticas cada una.
-- =====================================================================
-- select c.relname as tabla, c.relrowsecurity as rls,
--        (select count(*) from pg_policies p
--          where p.schemaname = 'public' and p.tablename = c.relname) as politicas
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public'
--    and c.relname in ('profiles','services','clients','appointments');
