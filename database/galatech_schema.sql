-- Esquema GALATECH para Supabase PostgreSQL.
-- Renombra las tablas existentes de forma no destructiva y conserva filas y relaciones.
do $$ begin
  if to_regclass('public.usuarios') is null and to_regclass('public.app_users') is not null then alter table public.app_users rename to usuarios; end if;
  if to_regclass('public.clientes') is null and to_regclass('public.clients') is not null then alter table public.clients rename to clientes; end if;
  if to_regclass('public.equipos') is null and to_regclass('public.equipment') is not null then alter table public.equipment rename to equipos; end if;
  if to_regclass('public.reparaciones') is null and to_regclass('public.repairs') is not null then alter table public.repairs rename to reparaciones; end if;
  if to_regclass('public.historial_reparaciones') is null and to_regclass('public.repair_history') is not null then alter table public.repair_history rename to historial_reparaciones; end if;
end $$;

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(), name varchar not null,
  email varchar not null unique, password_hash varchar not null,
  role varchar not null check (role in ('ADMIN','TECHNICIAN')),
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(), name varchar not null,
  email varchar, phone varchar, created_at timestamptz not null default now(),
  last_name varchar(120), dni varchar(24)
);
create table if not exists public.equipos (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clientes(id),
  kind varchar not null, brand varchar not null, model varchar, serial_number varchar,
  created_at timestamptz not null default now(), description text
);
create table if not exists public.reparaciones (
  id uuid primary key default gen_random_uuid(), tracking_code varchar not null unique check (length(tracking_code)>=8),
  client_id uuid not null references public.clientes(id), equipment_id uuid not null references public.equipos(id),
  technician_id uuid references public.usuarios(id),
  status varchar not null check (status in ('RECEIVED','DIAGNOSING','WAITING_PARTS','IN_REPAIR','REPAIRED','DELIVERED','CANCELLED')),
  diagnosis text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  problem_reported text, internal_observations text, customer_observations text,
  estimated_delivery date, delivered_at timestamptz
);
create table if not exists public.historial_reparaciones (
  id uuid primary key default gen_random_uuid(), repair_id uuid not null references public.reparaciones(id) on delete cascade,
  actor_id uuid references public.usuarios(id),
  status varchar not null check (status in ('RECEIVED','DIAGNOSING','WAITING_PARTS','IN_REPAIR','REPAIRED','DELIVERED','CANCELLED')),
  observation text, is_public boolean not null default true, created_at timestamptz not null default now(), previous_status varchar(32)
);

alter table public.clientes add column if not exists last_name varchar(120), add column if not exists dni varchar(24);
alter table public.equipos add column if not exists description text;
alter table public.reparaciones add column if not exists problem_reported text, add column if not exists internal_observations text, add column if not exists customer_observations text, add column if not exists estimated_delivery date, add column if not exists delivered_at timestamptz;
alter table public.historial_reparaciones add column if not exists previous_status varchar(32);

create unique index if not exists clients_dni_unique_idx on public.clientes(dni) where dni is not null;
create index if not exists idx_repairs_status on public.reparaciones(status);
create index if not exists repairs_technician_status_idx on public.reparaciones(technician_id,status);
create index if not exists repair_history_repair_created_idx on public.historial_reparaciones(repair_id,created_at desc);

alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.equipos enable row level security;
alter table public.reparaciones enable row level security;
alter table public.historial_reparaciones enable row level security;
-- Sin políticas para exponer estas tablas al Data API; Spring accede por JDBC privado.
