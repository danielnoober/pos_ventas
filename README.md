# FidelityPOS — Sistema de Puntos para Tarjetas al por Mayor

Sistema de punto de venta con programa de fidelización de puntos para distribuidores de tarjetas de recarga (Entel, Viva, Tigo).

---

## 🚀 Deploy en 5 pasos

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Elige nombre, contraseña y región (cualquiera de Sudamérica)
3. Espera a que el proyecto inicie (~2 min)
4. Ve a **SQL Editor** → pega el contenido de `supabase-schema.sql` → **Run**
5. Copia tus credenciales desde **Settings → API**:
   - `Project URL` → es tu `VITE_SUPABASE_URL`
   - `anon public` key → es tu `VITE_SUPABASE_ANON_KEY`

### 2. Configurar variables de entorno localmente

```bash
cp .env.example .env
# Edita .env con tus credenciales de Supabase
```

### 3. Instalar y probar localmente

```bash
npm install
npm run dev
# Abre http://localhost:5173
```

### 4. Subir a GitHub

```bash
git init
git add .
git commit -m "FidelityPOS inicial"
git remote add origin https://github.com/tu-usuario/fidelitypos.git
git push -u origin main
```

### 5. Deploy en Netlify

1. Ve a [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Conecta tu repositorio de GitHub
3. En **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. En **Environment variables** agrega:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu clave anon de Supabase
5. Click **Deploy site** ✅

---

## 👤 Credenciales por defecto

| Rol       | Usuario    | Contraseña |
|-----------|------------|------------|
| Admin     | `admin`    | `admin123` |
| Empleado  | `empleado` | `emp123`   |

> ⚠️ Cambia las contraseñas en Supabase después del primer ingreso:
> `UPDATE system_users SET password_hash = 'nueva_clave' WHERE username = 'admin';`

> ⚠️ Tras correr la migración multi-tienda, el usuario `empleado` no tiene tienda asignada
> todavía. Entra como `admin` → **Administración → Empleados** y asígnale una tienda,
> o no podrá usar el Punto de Venta.

---

## 📁 Estructura del proyecto

```
fidelitypos/
├── netlify.toml              ← Configuración de Netlify (SPA redirect)
├── supabase-schema.sql       ← Esquema completo de base de datos
├── .env.example              ← Plantilla de variables de entorno
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx               ← Rutas y estado global
    ├── index.css             ← Estilos globales
    ├── lib/
    │   ├── supabase.js       ← Cliente Supabase + uploadImage()
    │   ├── auth.jsx          ← Contexto de autenticación
    │   ├── store.jsx         ← Contexto de tienda activa (admin cambia, empleado fijo)
    │   ├── posChannel.js     ← Broadcast en tiempo real, un canal por tienda
    │   └── toast.jsx         ← Notificaciones
    ├── components/
    │   ├── Layout.jsx        ← Topbar + navegación + selector de tienda
    │   └── UI.jsx            ← Modal, ImageUpload, SearchInput, Confirm
    └── pages/
        ├── LoginPage.jsx     ← Login con selector Admin/Empleado
        ├── POSPage.jsx       ← Punto de venta (productos de la tienda activa)
        ├── CustomerScreen.jsx← Pantalla del cliente por tienda (ruta /cliente/:storeId)
        ├── HistoryPage.jsx   ← Historial de compras por cliente (con tienda)
        ├── RedeemPage.jsx    ← Canje de puntos por regalos
        └── AdminPage.jsx     ← CRUD: Productos, Regalos, Clientes, Anuncios, Tiendas, Empleados
```

---

## ✨ Funcionalidades

### Multi-tienda
- El admin crea tiendas y, dentro de cada una, su propio catálogo de productos y precios
- Cada empleado se asigna a una única tienda (Administración → Empleados) y solo opera esa tienda
- El admin puede vender por cualquier tienda usando el selector de tienda en la barra superior
- Cada tienda tiene su propia Pantalla Cliente en tiempo real (`/cliente/<id-tienda>`), así que dos tiendas vendiendo al mismo tiempo no se mezclan
- Clientes, puntos y catálogo de regalos son compartidos entre todas las tiendas (un solo programa de fidelización)

### Punto de Venta (Empleado + Admin)
- Filtro de productos por operadora (Entel / Viva / Tigo / General), acotado a la tienda activa
- Búsqueda de cliente con autocompletado en tiempo real (debounce 180ms)
- Pedido dinámico con ajuste de cantidades
- Registro de compra → suma puntos automáticamente (`total ÷ 10`)
- Pantalla del cliente en tiempo real (para segunda pantalla/monitor), independiente por tienda

### Historial
- Búsqueda rápida de cliente
- Lista de todas las compras con detalle de productos
- Lista de todos los canjes realizados con puntos consumidos

### Canjear Puntos
- Verificación de puntos disponibles antes del canje
- Muestra cuántos puntos faltan si no alcanza
- Registro del canje con nombre del regalo y puntos usados

### Administración (solo Admin)
- **Productos**: Crear/editar/eliminar con imagen, precio, operadora, categoría, stock — por tienda
- **Regalos**: Crear/editar/eliminar con imagen y puntos requeridos (compartido entre tiendas)
- **Clientes**: Crear/editar/eliminar con ID automático, ajuste manual de puntos (compartido entre tiendas)
- **Anuncios**: Slides para la pantalla de cliente en modo inactivo
- **Tiendas**: Crear/editar/desactivar tiendas
- **Empleados**: Crear/editar usuarios y asignarles la tienda en la que trabajan

### Imágenes
- Subida directa a Supabase Storage desde el panel admin
- Vista previa instantánea antes de guardar
- Drag & drop o click para seleccionar archivo (máx. 5MB)

---

## 🗄️ Tablas en Supabase

| Tabla            | Descripción                                          |
|------------------|-------------------------------------------------------|
| `stores`         | Tiendas administradas por el sistema                   |
| `system_users`   | Usuarios del sistema (admin/empleado), empleado → tienda |
| `clients`        | Clientes con acumulado de puntos (global)              |
| `products`       | Catálogo de tarjetas de recarga, por tienda            |
| `gifts`          | Catálogo de regalos canjeables (global)                |
| `purchases`      | Cabecera de cada compra, con tienda                    |
| `purchase_items` | Detalle de productos por compra                        |
| `redemptions`    | Registro de canjes de puntos (global)                  |
