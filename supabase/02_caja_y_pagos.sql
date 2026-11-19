-- =====================================================================
-- Agenda Eventia — Columnas para Caja y pagos
-- Correr en Supabase > SQL Editor (se puede correr más de una vez).
-- =====================================================================
alter table public.appointments
  add column if not exists deposit        numeric,                 -- anticipo recibido
  add column if not exists tip            numeric,                 -- propina
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('efectivo','transferencia','tarjeta')),
  add column if not exists paid           boolean not null default false,
  add column if not exists paid_at        timestamptz;

-- Guarda automáticamente cuándo se marcó como pagada (para el corte de caja)
create or replace function public.set_paid_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.paid and (old.paid is distinct from true) then
    new.paid_at = now();
  elsif not new.paid then
    new.paid_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointments_paid_at on public.appointments;
create trigger trg_appointments_paid_at before update on public.appointments
  for each row execute function public.set_paid_at();

create index if not exists appointments_user_paid_idx
  on public.appointments (user_id, paid, date);
