# 02. ARQUITECTURA

## Frontend (React + Vite)
- **Punto de Entrada:** `main.tsx` carga el proveedor global y los estilos de SLDS.
- **Enrutamiento (`App.tsx`):** Controla el acceso público (`/login`) y las rutas protegidas envueltas en `<AuthGuard>`. Las rutas protegidas se renderizan dentro de `<CorporateLayout>`, el cual provee el menú de navegación lateral.
- **Gestión de Estado Global:**
  - `TanStack Query (React Query)`: Actúa como el caché centralizado (`QueryClientProvider` en `main.tsx`) para gestionar el estado del servidor asíncrono, reduciendo drásticamente lecturas redundantes a la base de datos y ofreciendo navegación instantánea con un `staleTime` configurado (10s).
  - `CRMContext.tsx`: Maneja la sesión del usuario (Auth), lee su perfil desde `public.users`, e identifica su `tenant_id` y permisos.
  - `GlobalDataProvider.tsx`: Orquesta los datos dependientes del negocio (ej. Leads). Combina `useQuery` de TanStack con suscripciones WebSockets de Supabase (`channel.on('postgres_changes')`) para actualizar el caché de forma proactiva.

## Backend (Supabase)
- **Autenticación:** Proveedor OAuth de Google (`auth.users`).
- **Base de Datos:** PostgreSQL.
  - **Estructura Multi-Tenant:** Todas las tablas de negocio (`users`, `projects`, `leads`, `properties`) tienen una columna `tenant_id` que actúa como Foreign Key hacia la tabla `tenants`.
- **Automatizaciones Nativas (Postgres Triggers):**
  - Trigger en `auth.users` que al detectar un nuevo registro crea automáticamente una copia pública en `public.users` (y genera un `tenant_id` global si el usuario es el dueño).

## Estructura de Carpetas Principal
- `src/components/`: Componentes reutilizables de UI (Tablas, Modales, Gráficos).
- `src/pages/`: Vistas completas o Dashboards asociados a rutas.
- `src/layouts/`: Estructuras maestras (ej. `CorporateLayout` con el Sidebar).
- `src/context/`: Proveedores de contexto de React.
- `src/config/`: Clientes de inicialización (Supabase, Firebase [deprecated]).
