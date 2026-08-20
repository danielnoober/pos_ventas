-- ============================================================
-- MIGRACIÓN: MULTI-TIENDA
-- Ejecuta este bloque en el SQL Editor de tu proyecto Supabase
-- (proyecto ya en producción — no borra ni modifica datos existentes)
--
-- Qué hace:
--   1. Crea la tabla `stores`.
--   2. Crea UNA tienda ("Tienda Principal") para que tus productos
--      y compras existentes tengan dónde quedar asignados.
--   3. Agrega la columna store_id a system_users, products y purchases.
--   4. Asigna automáticamente todos tus productos/compras actuales
--      a "Tienda Principal".
--
-- No crea productos, regalos ni clientes de ejemplo — solo
-- estructura + la migración necesaria de tus datos reales.
--
-- Recomendado: haz un backup antes (Table Editor → Export CSV,
-- o pg_dump) y corre esto cuando nadie esté usando el POS.
-- ============================================================

begin;

-- 1. Tabla de tiendas
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table stores disable row level security;

-- 2. Crea una tienda por defecto para los datos ya existentes
insert into stores (name) select 'Tienda Principal' where not exists (select 1 from stores);

-- 3. system_users: a qué tienda está asignado el empleado
--    (null para admins, obligatorio para empleados — se valida en la app)
alter table system_users add column if not exists store_id uuid references stores(id);

-- 4. products: cada producto (y su precio) pertenece a una tienda
alter table products add column if not exists store_id uuid references stores(id);
update products set store_id = (select id from stores order by created_at limit 1) where store_id is null;
alter table products alter column store_id set not null;

-- 5. purchases: registra en qué tienda se hizo la venta (para el historial)
alter table purchases add column if not exists store_id uuid references stores(id);
update purchases set store_id = (select id from stores order by created_at limit 1) where store_id is null;

commit;

-- ============================================================
-- Verificación rápida (opcional) — corre esto después para confirmar:
--
-- select * from stores;
-- select count(*) from products where store_id is null;   -- debe dar 0
-- select count(*) from purchases where store_id is null;  -- debe dar 0
-- ============================================================
