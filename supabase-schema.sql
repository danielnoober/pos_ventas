-- ============================================================
-- FidelityPOS — Supabase Schema
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. USUARIOS DEL SISTEMA (admin / empleado)
create table if not exists system_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,         -- almacena como texto plano por simplicidad de demo; en prod usa bcrypt
  full_name text not null,
  role text not null check (role in ('admin','employee')),
  created_at timestamptz default now()
);

-- 2. CLIENTES
create table if not exists clients (
  id text primary key,                 -- número de celular o carnet de identidad del cliente
  full_name text not null,
  points integer not null default 0,
  created_at date default current_date
);

-- 3. PRODUCTOS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  operator text not null check (operator in ('Entel','Viva','Tigo','General')),
  category text not null,              -- ej: Recarga Bs.10, Recarga Bs.20 …
  image_url text,
  in_stock boolean not null default true,
  created_at timestamptz default now()
);

-- 4. REGALOS
create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points_required integer not null,
  description text,
  image_url text,
  created_at timestamptz default now()
);

-- 5. COMPRAS (cabecera)
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  client_id text references clients(id) on delete set null,
  total numeric(10,2) not null,
  points_earned integer not null default 0,
  created_by text,                     -- username del empleado
  created_at timestamptz default now()
);

-- 6. DETALLE DE COMPRAS
create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,          -- snapshot del nombre
  product_price numeric(10,2) not null,
  quantity integer not null default 1
);

-- 7. CANJES DE PUNTOS
create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  client_id text references clients(id) on delete set null,
  gift_id uuid references gifts(id) on delete set null,
  gift_name text not null,             -- snapshot
  points_used integer not null,
  created_by text,
  created_at timestamptz default now()
);

-- ============================================================
-- STORAGE BUCKET para imágenes
-- ============================================================
insert into storage.buckets (id, name, public)
values ('fidelitypos-images', 'fidelitypos-images', true)
on conflict do nothing;

-- Política: cualquiera puede leer (público)
create policy "Public read images"
  on storage.objects for select
  using ( bucket_id = 'fidelitypos-images' );

-- Política: cualquier usuario autenticado (anon key) puede subir
create policy "Anon upload images"
  on storage.objects for insert
  with check ( bucket_id = 'fidelitypos-images' );

create policy "Anon update images"
  on storage.objects for update
  using ( bucket_id = 'fidelitypos-images' );

create policy "Anon delete images"
  on storage.objects for delete
  using ( bucket_id = 'fidelitypos-images' );

-- ============================================================
-- RLS — deshabilitar para todas las tablas de la app
-- (la seguridad se maneja desde el frontend con el login propio)
-- ============================================================
alter table system_users disable row level security;
alter table clients disable row level security;
alter table products disable row level security;
alter table gifts disable row level security;
alter table purchases disable row level security;
alter table purchase_items disable row level security;
alter table redemptions disable row level security;

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Usuario admin por defecto  (cambia la contraseña después)
insert into system_users (username, password_hash, full_name, role)
values
  ('admin', 'admin123', 'Administrador', 'admin'),
  ('empleado', 'emp123', 'Empleado 1', 'employee')
on conflict do nothing;

-- Productos de ejemplo
insert into products (name, price, operator, category, in_stock) values
  ('Recarga Entel Bs. 10',   10.00, 'Entel', 'Recarga',  true),
  ('Recarga Entel Bs. 20',   20.00, 'Entel', 'Recarga',  true),
  ('Recarga Entel Bs. 50',   50.00, 'Entel', 'Recarga',  true),
  ('Recarga Viva Bs. 10',    10.00, 'Viva',  'Recarga',  true),
  ('Recarga Viva Bs. 20',    20.00, 'Viva',  'Recarga',  true),
  ('Recarga Tigo Bs. 10',    10.00, 'Tigo',  'Recarga',  true),
  ('Recarga Tigo Bs. 20',    20.00, 'Tigo',  'Recarga',  true),
  ('Recarga Tigo Bs. 50',    50.00, 'Tigo',  'Recarga',  true)
on conflict do nothing;

-- Regalos de ejemplo
insert into gifts (name, points_required, description) values
  ('Mochila',          500, 'Mochila de tela resistente'),
  ('Vaso Térmico',     200, 'Vaso de acero inoxidable 500ml'),
  ('Bebedero 1L',      300, 'Bebedero deportivo con filtro'),
  ('Taza Personalizada',150,'Taza cerámica exclusiva'),
  ('Bolsa Ecológica',  100, 'Bolsa de tela reutilizable')
on conflict do nothing;

-- Clientes de ejemplo  (id = número de celular o carnet)
insert into clients (id, full_name, points) values
  ('71234567', 'María González',  320),
  ('68901234', 'Juan Pérez',      850),
  ('4521890',  'Ana López',       120),
  ('75643210', 'Carlos Mamani',   1200),
  ('3892145',  'Lucía Flores',    450)
on conflict do nothing;


-- ============================================================
-- IMPORTAR CLIENTES DESDE EXCEL
-- ============================================================
-- Si tus datos de Excel tienen estas columnas:
--   id | nombre | compras | puntos_reclamados
--
-- Pasos:
-- 1. En Excel/Google Sheets, agrega una columna "puntos_actuales"
--    con la formula: = compras - puntos_reclamados
--    (o el saldo real de puntos que tenga cada cliente)
--
-- 2. Exporta como CSV (File → Save As → CSV)
--
-- 3. En Supabase ve a: Table Editor → clients → Import data (CSV)
--    Mapea las columnas así:
--      id          → id
--      nombre      → full_name
--      puntos_act  → points
--    (ignora compras y puntos_reclamados, no son columnas de la tabla)
--
-- 4. Alternativamente puedes usar este SQL con los datos pegados:
--
-- INSERT INTO clients (id, full_name, points) VALUES
--   ('71234567', 'Nombre Apellido', 320),
--   ('68901234', 'Otro Cliente',    150),
--   -- ... agrega una fila por cada cliente
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   points    = EXCLUDED.points;
--
-- El ON CONFLICT hace que si ya existe el cliente, lo actualice
-- en vez de generar un error.
-- ============================================================

-- ============================================================
-- TABLA: slides de anuncios para pantalla cliente
-- ============================================================
create table if not exists slides (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Habilitar Realtime en las tablas que necesitamos
-- (ejecuta esto también en el SQL Editor)
alter publication supabase_realtime add table slides;

-- El canal de estado del POS lo manejamos con Supabase Broadcast
-- (no necesita tabla, es efímero)
