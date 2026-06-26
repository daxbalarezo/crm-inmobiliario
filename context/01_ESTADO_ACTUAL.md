# 01. ESTADO ACTUAL DEL PROYECTO

## Tareas Completadas (Terminado)
- **Migración a Supabase (Fase 1):** Configuración inicial del cliente Supabase (`src/config/supabase.ts`) y esquema de base de datos (`01_schema.sql`).
- **Autenticación (Auth):** Login con Google OAuth configurado. Creación automática del perfil en la tabla `public.users` al registrarse mediante un Database Trigger.
- **Roles y Enrutamiento:** Lógica de `AuthGuard` y `HomeRoute` (`App.tsx`) para redirigir a cada usuario a su panel correspondiente según su rol (`owner`, `manager`, `agent`).
- **UI/UX Core:** Inyección nativa de CSS de Salesforce Lightning Design System (SLDS) en Vite (`main.tsx`). Tailwind fue completamente desactivado para evitar conflictos de estilos.
- **Panel de Dueño (CompaniesDashboard):** Arquitectura de nivel Enterprise (Estilo Salesforce/Twenty) completada. Cuenta con List Views interactivas, métricas computadas de uso de inquilinos (queries relacionales a Supabase), Split Views (Paneles laterales de detalle) y capacidad de Suplantación de Identidad (Impersonation).
- **Migración de Negocio (ProjectsDashboard):** Migrado completamente de Firebase a Supabase (`crmService.ts`). UI refactorizada para usar estrictamente clases globales SLDS.
- **SettingsDashboard:** Migrado completamente a Supabase.

## En Progreso (A medias)
- **Migración Restante (Fase 2):** Diversos paneles (`AdminDashboard`, etc.) y el inyector de datos de prueba (`dataSeeder.ts`) aún contienen referencias a `firebase/firestore`. Deben refactorizarse para usar `supabase.from()`.

## Pendientes (Por hacer)
- **Row Level Security (RLS) en Supabase:** Activar y escribir las políticas de seguridad en la base de datos para asegurar el Multi-Tenancy (garantizar que el Inquilino A no pueda leer los leads del Inquilino B).
- **Traducción de Consultas Complejas:** Refactorizar dashboards de reportes analíticos complejos que aún usan la lógica de agregación de Firebase.
- **Pruebas E2E:** Simular un flujo completo desde un Agente recibiendo un Lead hasta convertirlo en venta usando el inventario.
