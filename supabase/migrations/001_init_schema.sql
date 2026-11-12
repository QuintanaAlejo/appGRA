-- =============================================================================
-- GRA Caja Diaria — Esquema inicial y Row Level Security (Supabase Free Tier)
-- Referencia: docs/PRD-002-caja-diaria-gra.md (RF-01 a RF-31, RNF-06)
-- =============================================================================

-- 1. Tabla de perfiles y roles ('carga' | 'admin')
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null default '',
  rol text not null default 'carga' check (rol in ('carga', 'admin')),
  created_at timestamptz not null default now()
);

-- Función helper para evaluar si el usuario autenticado tiene rol 'admin'
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.perfiles
    where id = auth.uid()
      and rol = 'admin'
  );
$$;

-- Trigger automático: al crearse un usuario en auth.users, crea su fila en public.perfiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email, nombre, rol)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'nombre', split_part(coalesce(new.email, 'usuario'), '@', 1)),
    case
      when new.raw_user_meta_data->>'rol' in ('carga', 'admin') then new.raw_user_meta_data->>'rol'
      else 'carga'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Cajas (7 cajas fijas del equipo GRA)
create table if not exists public.cajas (
  id text primary key,
  nombre text not null unique,
  grupo text not null default 'operativa' check (grupo in ('operativa', 'socio')),
  orden int not null default 1,
  regla_default text not null default 'arrastre' check (regla_default in ('cero', 'arrastre', 'arrastre_mas_fijo', 'manual')),
  monto_fijo_default numeric(14,2) not null default 0
);

-- 3. Categorías de movimientos (Ingresos, Egresos operativos, Financieros, Socios)
create table if not exists public.categorias (
  id text primary key,
  nombre text not null,
  tipo text not null default 'egreso' check (tipo in ('ingreso', 'egreso', 'ambos')),
  activo boolean not null default true,
  orden int not null default 1,
  created_at timestamptz not null default now()
);

-- 4. Medios de pago
create table if not exists public.medios_pago (
  id text primary key,
  nombre text not null,
  activo boolean not null default true,
  orden int not null default 1,
  created_at timestamptz not null default now()
);

-- 5. Configuración de saldos iniciales por mes y caja (RF-08)
create table if not exists public.saldos_iniciales (
  id text primary key,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  caja_id text not null references public.cajas(id) on delete cascade,
  regla text not null default 'arrastre' check (regla in ('cero', 'arrastre', 'arrastre_mas_fijo', 'manual')),
  monto_fijo numeric(14,2) not null default 0,
  saldo_inicial numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (mes, caja_id)
);

-- 6. Saldos bancarios y deuda mensual (RF-24, RF-25 — exclusivo rol 'admin')
create table if not exists public.saldos_bancarios (
  id text primary key,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  entidad_id text not null,
  entidad_nombre text not null,
  es_deuda boolean not null default false,
  saldo_inicio_mes numeric(14,2) not null default 0,
  saldo_fin_mes numeric(14,2),
  updated_at timestamptz not null default now(),
  unique (mes, entidad_id)
);

-- 7. Movimientos diarios de caja (RF-17 a RF-23)
create table if not exists public.movimientos (
  id text primary key,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  orden_fila int not null default 1,
  fecha date not null,
  detalle text not null,
  caja_id text not null references public.cajas(id) on delete restrict,
  categoria_id text not null references public.categorias(id) on delete restrict,
  medio_pago_id text not null references public.medios_pago(id) on delete restrict,
  ingreso numeric(14,2) not null default 0 check (ingreso >= 0),
  egreso numeric(14,2) not null default 0,
  es_transferencia_interna boolean not null default false,
  operacion_vinculada_id text,
  creado_por text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_movimientos_mes_orden on public.movimientos (mes, fecha, orden_fila);
create index if not exists idx_movimientos_caja on public.movimientos (mes, caja_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — RNF-06, AC-03, AC-04
-- =============================================================================

alter table public.perfiles enable row level security;
alter table public.cajas enable row level security;
alter table public.categorias enable row level security;
alter table public.medios_pago enable row level security;
alter table public.saldos_iniciales enable row level security;
alter table public.saldos_bancarios enable row level security;
alter table public.movimientos enable row level security;

-- Perfiles: cada usuario lee su propio perfil; admin puede ver y administrar todos
create policy "perfiles_select_own_or_admin"
  on public.perfiles for select
  to authenticated
  using (id = auth.uid() or public.es_admin());

create policy "perfiles_write_admin"
  on public.perfiles for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Cajas: lectura para cualquier usuario autenticado, edición solo admin
create policy "cajas_select_authenticated"
  on public.cajas for select
  to authenticated
  using (true);

create policy "cajas_write_admin"
  on public.cajas for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Categorías y Medios de Pago: lectura y gestión para usuarios autenticados (RF-09 a RF-16)
create policy "categorias_all_authenticated"
  on public.categorias for all
  to authenticated
  using (true)
  with check (true);

create policy "medios_pago_all_authenticated"
  on public.medios_pago for all
  to authenticated
  using (true)
  with check (true);

-- Saldos iniciales de cajas: lectura para todos (necesario para calcular saldo actual de las 7 cajas),
-- pero alta/modificación exclusiva del rol 'admin' (RF-04, RF-08)
create policy "saldos_iniciales_select_authenticated"
  on public.saldos_iniciales for select
  to authenticated
  using (true);

create policy "saldos_iniciales_write_admin"
  on public.saldos_iniciales for insert
  to authenticated
  with check (public.es_admin());

create policy "saldos_iniciales_update_admin"
  on public.saldos_iniciales for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "saldos_iniciales_delete_admin"
  on public.saldos_iniciales for delete
  to authenticated
  using (public.es_admin());

-- Saldos bancarios y Deuda San Pablo: BLOQUEADO para rol 'carga' tanto en lectura como en escritura (RF-04, AC-04)
create policy "saldos_bancarios_admin_only"
  on public.saldos_bancarios for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Movimientos diarios: lectura, alta, edición y baja para usuarios autenticados ('carga' y 'admin')
create policy "movimientos_all_authenticated"
  on public.movimientos for all
  to authenticated
  using (true)
  with check (true);
