# 05. CHANGELOG (Historial de Cambios)

Este archivo mantiene un registro cronológico de todas las modificaciones importantes, nuevas funcionalidades y correcciones de errores en el proyecto.

---

## [2026-06-26] - Mejoras UI y Manejo de Errores en Dashboards
**Objetivo del cambio:** Limpiar redundancias visuales y fortalecer la conexión frontend-Supabase con control estricto de errores.
- **CompaniesDashboard**: 
  - Se eliminó el botón y modal redundante de "Precios" (`PlanPricingModal`).
  - Se restauró el envío de la columna `ruc` hacia la tabla `tenants`.
  - Se añadió un control de errores (throw) al insertar el primer proyecto, evitando que los fallos de la base de datos pasen desapercibidos.
- **ProjectsDashboard**: Se implementó la visualización nativa de errores de conexión y esquema (`fetchError`) para transparentar problemas de RLS o tablas inexistentes.

## [2026-06-26] - Refactorización de Data Model y Fix Arquitectónico de Owner
**Objetivo del cambio:** Eliminar dependencias de Firebase en el motor de campos personalizados (Data Model) e implementar la arquitectura global del dueño de la plataforma (Owner).
**Archivos modificados:** `02_fix_owner_architecture.sql`, `src/hooks/useTenantSchema.ts`, `src/pages/settings/DataModelSettings.tsx`, `src/types/definitions.ts`.
**Detalles:** 
1. Se ajustó el trigger de registro en Supabase para que los correos asignados como Owner no generen un tenant basura (su `tenant_id` queda en NULL).
2. Se reemplazó el uso de subcolecciones de Firestore (`schema_lead`) por la columna nativa de Postgres `fields JSONB` en la tabla `tenants`.
3. Se actualizó la interfaz SLDS en `DataModelSettings` para leer y grabar la estructura de los campos dinámicos y propagar los cambios usando Supabase Realtime.

## [2026-06-25] - Migración a Supabase y UI Estricta (ProjectsDashboard)
**Objetivo del cambio:** Eliminar dependencias de Firebase en el panel de proyectos y alinear la UI con el estándar SLDS puro (Cero Custom CSS).
**Archivos modificados:** `src/pages/ProjectsDashboard.tsx`, `src/services/crmService.ts`
**Descripción técnica:** 
- Creación de `crmService.ts` usando Supabase JS para operaciones CRUD de Proyectos.
- Eliminación de importaciones de `firebase/firestore`.
- Refactorización visual de `ProjectsDashboard.tsx` removiendo `SettingsDashboard.module.css` y aplicando clases globales de Salesforce Lightning Design System (ej. `slds-page-header`, `slds-card`, `slds-table`, `slds-modal`).
**Impacto en el sistema:** El panel es ahora 100% nativo a Supabase y la interfaz visual mantiene la densidad corporativa deseada sin hacks de CSS locales.
**Próximos pasos:** Continuar con la refactorización de `AdminDashboard` y `SettingsDashboard`.

## [2026-06-25] - Esquema Supabase: Módulo de Proyectos (Camino B)
**Objetivo del cambio:** Iniciar la migración del inventario de proyectos (ProjectsDashboard) de Firebase a Supabase.
**Archivos modificados:** `supabase_schema_crm_projects.sql`
**Descripción técnica:** 
- Creación del script SQL con la tabla `projects` (con relación a `tenants`).
- Habilitación de Row Level Security (RLS) para la nueva tabla.
**Impacto en el sistema:** Sienta las bases relacionales para que el módulo Manager/Comercial deje de consumir datos falsos o de Firebase.
**Riesgos conocidos:** Requiere ejecución manual por parte del administrador en la consola de Supabase.
**Próximos pasos:** Desarrollar `crmService.ts` y migrar la UI estricta con SLDS en `ProjectsDashboard.tsx`.

## [2026-06-25] - Inicialización del Cerebro Obsidian
**Objetivo del cambio:** Establecer una política de documentación continua y un repositorio centralizado de contexto ("Cerebro Obsidian").
**Archivos modificados:** `context/*.md`, `.agents/AGENTS.md`
**Descripción técnica:** 
- Creación de los archivos base de arquitectura, convenciones y estado del proyecto.
- Inyección de la "Política Obligatoria de Documentación" en el System Prompt del Agente a través de `.agents/AGENTS.md`.
**Impacto en el sistema:** Mejora la mantenibilidad, previene alucinaciones de la IA y establece un flujo de trabajo profesional.
**Riesgos conocidos:** Ninguno.
**Próximos pasos:** Continuar con la migración de los dashboards restantes de Firebase a Supabase manteniendo esta política de documentación activa.

## [2026-06-25] - Corrección Arquitectónica del Sidebar (Owner vs Manager)
**Objetivo del cambio:** Separar el menú lateral para dueños del sistema (Super Administradores).
**Archivos modificados:** `src/layouts/CorporateLayout.tsx`
**Descripción técnica:** 
- Se separó la lógica en el array `navItems` que agrupaba condicionalmente a `owner` y `manager`. 
- Ahora el `owner` solo visualiza 'Inmobiliarias' y 'Configuración Técnica', eliminando las vistas de analítica y gestión operativa que solo aplican a nivel de inquilino (tenant).
**Impacto en el sistema:** Mejora la jerarquía visual de roles y evita confusión con métricas de tenants específicos.
**Riesgos conocidos:** Ninguno.
**Próximos pasos:** Validar visualmente y continuar migrando paneles restantes.

## [2026-06-25] - Refactorización Estricta a SLDS (CompaniesDashboard)
**Objetivo del cambio:** Eliminar deuda técnica de UI y migrar el Panel de Inmobiliarias al estándar corporativo estricto de Salesforce.
**Archivos modificados:** `src/pages/CompaniesDashboard.tsx`
**Descripción técnica:** 
- Eliminación de CSS local (`SettingsDashboard.module.css`) en favor de utilidades de SLDS puro.
- Implementación del patrón `slds-page-header`.
- Implementación de cuadrículas (`slds-grid slds-gutters`) y tarjetas (`slds-card`) para los KPIs financieros y el desglose de planes.
- Migración de la tabla HTML a `slds-table slds-table_cell-buffer slds-table_bordered slds-table_striped`.
- Reescritura del modal de creación usando las directrices exactas de accesibilidad y estructura de `slds-modal`.
**Impacto en el sistema:** El panel ahora luce 100% nativo al estándar Salesforce, mejorando la percepción Enterprise de la aplicación.
**Riesgos conocidos:** Ninguno.
**Próximos pasos:** Aplicar el mismo nivel de rigor estructural a los demás dashboards (AdminDashboard, Comercial, etc.).

## [2026-06-25] - Correcciones UI Globales (Brand Band y Selects)
**Objetivo del cambio:** Estandarizar pequeños detalles visuales y documentarlos como reglas de desarrollo.
**Archivos modificados:** `src/layouts/CorporateLayout.module.css`, `src/pages/CompaniesDashboard.tsx`, `context/03_CONVENCIONES.md`
**Descripción técnica:** 
- Se implementó un "Brand Band" (fondo celeste) de altura fija (220px) en `CorporateLayout` mediante un seudo-elemento `::before`, garantizando consistencia sin importar la longitud del contenido de la página.
- Se eliminó el fondo gris por defecto de la clase `slds-page-header` en el panel de Inmobiliarias.
- Se forzó `appearance: none` en los `<select>` nativos dentro de las tablas SLDS para evitar flechas duplicadas.
- Se registraron estas 3 decisiones en `03_CONVENCIONES.md` como Reglas Estrictas de Renderizado UI.
**Impacto en el sistema:** Mayor pulcritud visual y consistencia garantizada para futuras pantallas.

## [2026-06-25] - Arquitectura Enterprise para el Dashboard Súper Admin
**Objetivo del cambio:** Evolucionar el antiguo archivo monolítico a una arquitectura escalable, modular y alineada con los estándares de CRMs B2B (como Salesforce y Twenty).
**Archivos modificados:** `App.tsx`, `src/pages/owner/CompaniesDashboard/*`
**Descripción técnica:** 
- Se destruyó el archivo `CompaniesDashboard.tsx` y se recreó como un módulo completo dentro del directorio `owner`.
- **Métricas Computadas:** Se implementó una consulta a Supabase (`select('*, users(count), projects(count)')`) para cargar en tiempo real el uso de recursos de cada inquilino.
- **Split View:** Se agregó el `TenantDetailPanel` deslizable.
- **Impersonación:** Se conectó el botón "Login As" en el panel de detalles con el contexto global `CRMContext` para suplantar la sesión del inquilino y auditar cuentas.
**Impacto en el sistema:** Convierte una simple interfaz visual en una herramienta operativa potente para el dueño del SaaS.
**Próximos pasos:** Extender el uso de List Views y Split Views al Panel Comercial de los Agentes (Leads).
