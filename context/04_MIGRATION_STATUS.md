# ESTADO ACTUAL DEL PROYECTO (Handover para Nueva Sesión)

Este documento resume los avances recientes y el estado actual de la migración para que la próxima sesión de IA tenga el contexto exacto de dónde retomar.

## 1. Migración del Módulo Owner a Supabase (Completado)

Todo el **Módulo Owner** ha sido desconectado de los mockups en memoria y ahora está 100% conectado a **Supabase** mediante el servicio `src/services/saasService.ts`.

Las tablas creadas y conectadas son:
- `tenants` -> Conectado a `CompaniesDashboard.tsx`
- `saas_plans` -> Conectado a `PlanManagement.tsx`
- `saas_subscriptions` -> Conectado a `BillingDashboard.tsx`
- `saas_seed_templates` -> Conectado a `SeedTemplates.tsx`
- `saas_broadcasts` -> Conectado a `BroadcastsDashboard.tsx`
- `saas_audit_logs` -> Conectado a `GlobalAuditDashboard.tsx`

*Nota: El script SQL `supabase_schema_saas.sql` ya fue ejecutado exitosamente en la base de datos.*

## 2. El Problema de los "Datos Falsos"

Al cambiar la gorra a modo "Manager" o "Comercial", el usuario notará que páginas como `ProjectsDashboard.tsx`, `CommercialDashboard.tsx` y `HomeDashboard.tsx` **todavía muestran datos falsos o arrojan errores**. 

**¿Por qué sucede esto?**
- Estas páginas del **Core del CRM** todavía importan y consumen **Firebase** (`import { db } from '../config/firebase'`).
- La base de datos de Firebase contiene los datos falsos/hardcodeados de fases anteriores del proyecto.
- `GlobalDataProvider.tsx` está intentando llamar a una tabla `leads` en Supabase que **todavía no ha sido creada.

## 3. Próximos Pasos (El "Camino B")

Para la siguiente sesión, la directiva del usuario es proceder **"Page por Page"** migrando el Core del Negocio (Módulo Manager/Comercial) hacia Supabase.

El primer paso recomendado es **Migrar `ProjectsDashboard.tsx`**:
1. Escribir el script SQL para la tabla `projects` (con `tenant_id`).
2. Crear `src/services/crmService.ts` para manejar el CRUD de proyectos.
3. Desconectar `ProjectsDashboard.tsx` de Firebase y conectarlo a Supabase.

## 4. Reglas UI Actualizadas (SLDS)

Durante esta sesión se documentó una nueva regla en `03_CONVENCIONES.md`:
- **Regla 13 (Tablas SLDS):** Queda estrictamente prohibido el uso de `slds-table_header-fixed_container`. Estaba causando un glitch visual (fondo gris) donde la barra de búsqueda se sobreponía al encabezado. Se deben usar tablas estándar (`slds-table slds-table_cell-buffer slds-table_bordered`) envueltas en un simple `slds-scrollable_y`.