-- =========================================================
-- OPTIMIZACIÓN DEL FLUJO DE REPOSICIÓN Y CONTROL DE STOCK
-- Tienda Mass — Sprint 1: Base de datos (Supabase / PostgreSQL)
-- Cubre: HU01 (stock en tiempo real), HU05 (ingreso de
-- mercadería que actualiza el stock automáticamente)
-- =========================================================

-- Extensión necesaria para generar UUIDs
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. Proveedores
-- ---------------------------------------------------------
create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. Productos (estado actual del stock por SKU)
-- ---------------------------------------------------------
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  nombre text not null,
  categoria text,
  unidad text not null default 'unidad',
  stock_actual integer not null default 0,
  stock_minimo integer not null default 0,
  proveedor_id uuid references proveedores(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_productos_categoria on productos (categoria);

-- ---------------------------------------------------------
-- 3. Movimientos de stock (histórico: ingreso, reposición,
--    venta, ajuste). Es la fuente de verdad; stock_actual
--    en "productos" se recalcula automáticamente vía trigger.
-- ---------------------------------------------------------
create table if not exists movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id),
  tipo text not null check (tipo in ('ingreso','reposicion','venta','ajuste')),
  cantidad integer not null check (cantidad > 0),
  guia_remision text,          -- para ingresos de proveedor (HU05)
  usuario text,                -- quién registró el movimiento
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists idx_movimientos_producto on movimientos_stock (producto_id, created_at desc);

-- ---------------------------------------------------------
-- 4. Trigger: actualizar stock_actual automáticamente
--    (ingreso/reposición suman, venta/ajuste restan)
-- ---------------------------------------------------------
create or replace function fn_actualizar_stock()
returns trigger
language plpgsql
as $$
begin
  if new.tipo in ('ingreso', 'reposicion') then
    update productos
       set stock_actual = stock_actual + new.cantidad,
           updated_at = now()
     where id = new.producto_id;
  elsif new.tipo in ('venta', 'ajuste') then
    update productos
       set stock_actual = greatest(stock_actual - new.cantidad, 0),
           updated_at = now()
     where id = new.producto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_actualizar_stock on movimientos_stock;
create trigger trg_actualizar_stock
after insert on movimientos_stock
for each row execute function fn_actualizar_stock();

-- ---------------------------------------------------------
-- 5. Vista de alertas de quiebre de stock (para HU03, futuro
--    Sprint 3, pero útil desde ahora para el dashboard)
-- ---------------------------------------------------------
create or replace view v_alertas_quiebre as
select id, sku, nombre, categoria, stock_actual, stock_minimo
from productos
where stock_actual <= stock_minimo
order by (stock_minimo - stock_actual) desc;

-- ---------------------------------------------------------
-- 6. Row Level Security
--    Nota académica: para el prototipo del curso se deja
--    acceso abierto con la anon key. Antes de un despliegue
--    real, esto debe restringirse por rol/usuario autenticado.
-- ---------------------------------------------------------
alter table proveedores enable row level security;
alter table productos enable row level security;
alter table movimientos_stock enable row level security;

drop policy if exists "demo_all_proveedores" on proveedores;
create policy "demo_all_proveedores" on proveedores for all using (true) with check (true);

drop policy if exists "demo_all_productos" on productos;
create policy "demo_all_productos" on productos for all using (true) with check (true);

drop policy if exists "demo_all_movimientos" on movimientos_stock;
create policy "demo_all_movimientos" on movimientos_stock for all using (true) with check (true);

-- ---------------------------------------------------------
-- 7. Habilitar Realtime en "productos" (para HU01: stock
--    en tiempo real en la interfaz)
-- ---------------------------------------------------------
alter publication supabase_realtime add table productos;
