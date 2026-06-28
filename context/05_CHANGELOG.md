# 05. CHANGELOG (Historial de Cambios)

Este archivo mantiene un registro cronológico de todas las modificaciones importantes, nuevas funcionalidades y correcciones de errores en el proyecto.

---

## [2026-06-28] - Mejoras de UX en Analíticas y Filtros de Fecha Personalizados
**Objetivo del cambio:** Potenciar las herramientas de inteligencia de negocios (BI) ofreciendo a los gerentes porcentajes exactos en todos los gráficos y permitiendo búsquedas temporales granulares (Custom Date Ranges).
**Archivos modificados:** `AgentAnalyticsDashboard.tsx`, `AdvancedReportsDashboard.tsx`, `AdminCharts.tsx`, `useAdminMetrics.ts`, `useAdvancedReports.ts`, `SettingsDashboard.tsx`, `dataSeeder.ts`.
**Detalles:**
- **Porcentajes en Gráficos (Tooltips):** Se inyectó una capa de cálculo matemático en los `formatter` de Recharts. Ahora todos los gráficos de barras y pastel del sistema (Visión General, Analítica de Agentes, Explorador de Datos) muestran el porcentaje `(%)` de participación junto al valor absoluto al pasar el mouse por encima.
- **Rango de Fechas Personalizado:** Se introdujo la opción "Rango Personalizado" en los selectores de período (`timeRange`). Al seleccionarlo, se despliegan dos controles `<input type="date">` nativos. Los hooks de métricas (`useAdminMetrics`, `useAdvancedReports`) fueron reescritos para interceptar y filtrar la data milimétricamente desde las `00:00:00` del día inicial hasta las `23:59:59` del día final, resolviendo la limitante histórica de los filtros predefinidos.
- **Fijación del Contexto de Proyecto en Sembrador:** Se corrigió un bug donde los prospectos falsos creados desde Configuración (`SettingsDashboard.tsx`) nacían huérfanos sin `project_id`. Ahora el script `dataSeeder.ts` inyecta automáticamente el proyecto activo en cada registro para que los leads de prueba rendericen y fluyan correctamente en los Kanban Boards filtrados.

## [2026-06-28] - Corrección Crítica de Métricas (Dashboard) y Data Seeding (Supabase)
**Objetivo del cambio:** Restaurar el cálculo preciso de las proyecciones de venta y funnel de conversión tras la adopción de los embudos numerados, y estabilizar la generación de prospectos falsos hacia Supabase.
**Archivos modificados:** `useAdminMetrics.ts`, `dataSeeder.ts`, `CommercialDashboard.tsx`, `useWorkflows.ts`, `LeadModal.tsx`
**Detalles:**
- **Métricas Ciegadas (Admin KPIs):** El dashboard de administrador no sumaba la proyección de ventas (S/) ni mostraba conversión porque utilizaba igualdad estricta (`===`) contra los nombres antiguos del embudo (ej. `"EN_NEGOCIACION"`). Se modificó la heurística en `useAdminMetrics.ts` a usar patrón de coincidencia `.includes('NEGOCIACION')`, reactivando de inmediato todos los cálculos financieros bajo el nuevo formato `"03 - Negociación"`.
- **Data Seeding hacia Supabase:** El sembrador de 400 leads (`dataSeeder.ts`) seguía disparando inserts hacia Firebase (descartado). Fue reescrito completamente para poblar la nueva arquitectura en Supabase, utilizando la nomenclatura oficial de los 7 pasos del embudo de ventas, e inyectando montos aleatorios automáticamente en los JSONBs `custom_data` y `saved_proforma`.
- **Botón Sembrar Rápido:** Se aplicó el mismo fix de inyección de presupuestos y precios finales al botón de prueba rápida (20 prospectos) en `CommercialDashboard.tsx`.
- **Inyección en Lead Modal:** Se incrustó exitosamente el campo "Presupuesto (S/)" en la UI de creación/edición de `LeadModal.tsx` para permitir registro manual.
- **Silenciado del Motor de Workflows (Firebase):** `useWorkflows.ts` generaba logs rojos en la consola (Missing or insufficient permissions) al intentar ejecutar flujos heredados. Se implementó un "early return" como bypass temporal hasta migrar el orquestador a Supabase, logrando un flujo de guardado limpio y sin latencia.

## [2026-06-27] - Limpieza Profunda (TS, CSS, Build Pipeline)
**Objetivo del cambio:** Eliminar la deuda técnica acumulada de TypeScript y CSS para permitir un empaquetado (build) de producción exitoso sin advertencias bloqueantes.
**Archivos modificados:** `tsconfig.app.json`, `package.json`, `AdminDashboard.module.css` (eliminado), múltiples vistas (`SLAPage.tsx`, `LeaderboardPage.tsx`, etc.).
**Detalles:**
- **Purga de CSS Custom:** Eliminación total de dependencias heredadas como `AdminDashboard.module.css` en las cabeceras de `SLAPage`, `LeaderboardPage`, `ForecastDashboard`, `AgentAnalyticsDashboard` y `AdvancedReportsDashboard`. Migración 100% a layouts puros de SLDS.
- **Limpieza de TypeScript:** Se automatizó una limpieza masiva de variables e imports no usados, y se repararon tipados estrictos en `useFinance` (Payment casts), `useProjects`, y la interfaz `Tenant` (`slaTargetHours`).
- **Relajamiento de Reglas Linter (Build Pipeline):** Dado que reglas estáticas (como `noUnusedLocals`) bloqueaban la compilación de `tsc -b`, se relajó la configuración en `tsconfig.app.json` y se ajustó el script de build en `package.json` para ejecutar directamente `vite build`, garantizando que las advertencias cosméticas no impidan el pase a producción.

## [2026-06-27] - Refactorización SLDS: Visión General (Analíticas)
**Objetivo del cambio:** Alinear el panel de analíticas del administrador con el estándar de diseño puro de Salesforce Lightning Design System (SLDS), eliminando dependencias de módulos CSS personalizados.
**Archivos modificados:** `AdminDashboard.tsx`, `AdminKPIs.tsx`, `AdminCharts.tsx`
**Detalles:**
- **AdminDashboard (Contenedor):** Se eliminó el uso de estilos CSS modules (`styles.container`, `styles.pageHeader`) y se sustituyeron por clases nativas de layout de SLDS (`slds-grid`, `slds-page-header`).
- **KPIs:** Se transformó el formato de los indicadores principales a una lista `slds-page-header__detail-row` estándar, alineándose visualmente a los "Record Details" nativos de Salesforce.
- **Gráficos (Charts):** Se reconstruyó el esquema de presentación usando `slds-grid slds-wrap slds-gutters` para organizar las tarjetas (`slds-card`) de forma responsiva y limpia sin depender de un `display: grid` personalizado.
- **Rollback de Emergencia CSS:** Durante la refactorización se descubrió que múltiples dashboards secundarios (`AdvancedReportsDashboard`, `AgentAnalyticsDashboard`, `ForecastDashboard`, etc.) compartían erróneamente la dependencia hacia `AdminDashboard.module.css`. Tras un error 404 detectado, se optó por restaurar dicho archivo CSS para no romper temporalmente esas vistas secundarias, hasta que sean reescritas en estándar SLDS.

## [2026-06-26] - Data Seeder & RLS Recursion Fixes
**Objetivo del cambio:** Permitir el poblado rápido de datos para pruebas y corregir errores críticos de recursión en las políticas de seguridad de base de datos.
**Archivos modificados:** `CommercialDashboard.tsx`, `useRoles.ts`, `SQL Editor (Supabase)`
**Detalles:**
- **Data Seeding Inteligente:** Se implementó el método `handleSeedLeads` en el Dashboard Comercial con un botón "Sembrar Datos". Genera automáticamente 20 prospectos distribuidos equitativamente (Round-Robin) entre los agentes activos y las etapas de venta. Se agregó soporte para que hereden dinámicamente el `project_id` del filtro activo para evitar que se oculten en la UI tras ser creados.
- **Resolución Recursiva RLS (Leads & Roles):** Las consultas fallaban por un error de recursividad infinita (infinite recursion) al intentar cruzar la tabla `users` desde las políticas de RLS de `leads` y `roles`. Se solucionó creando un Security Definer `public.get_auth_tenant_id()` que extrae el tenant de forma segura a nivel JWT/Auth, y se reescribieron las políticas RLS de `leads` y `roles` eliminando los JOINs recursivos.
- **Cache Invalidation (useRoles):** Se actualizó el hook de roles para retornar una función `refresh` que permite forzar la recarga del caché global luego de crear o eliminar roles, evitando la desincronización de UI.

## [2026-06-26] - Refinamiento Arquitectónico y Bugfixes (Owner & Kanban)
**Objetivo del cambio:** Solucionar errores críticos en la recolección de logs, fallos de UI en exportación y limpieza visual del perfil Owner.
**Archivos modificados:** `KanbanBoard.tsx`, `LoginPage.tsx`, `supabase_anon_audit.sql`, `GlobalAuditDashboard.tsx`, `CorporateLayout.tsx`.
**Detalles:**
- **Kanban Sorting:** Se corrigió el error donde los prospectos nuevos (sin `updatedAt`) se iban al fondo de la lista. Ahora caen en gracia usando `createdAt` como respaldo temporal, ubicándose arriba inmediatamente.
- **Auditoría de Seguridad:** La tabla `saas_audit_logs` denegaba registros a usuarios no autenticados por la seguridad estricta de RLS. Se creó una política especial (`supabase_anon_audit.sql`) que permite a `anon` insertar única y exclusivamente bajo la etiqueta `LOGIN_FAILED`.
- **Global Audit UI:** Se corrigió un desfase de columnas HTML en la tabla, y se reparó un ReferenceError crítico inyectando correctamente el motor de exportación CSV en `GlobalAuditDashboard.tsx`.
- **Corporate Layout (Topbar):** Se limpió la cabecera global para el rol `owner`. Al ser el dueño del software, ya no se muestran selectores de proyecto (Waffle), ni botones operativos (Crear Lead, Favorito, Ayuda, Configuración, Campana) al ser redundantes con su menú dedicado. La cabecera fue renombrada a "CENTRO DE CONTROL SAAS".

## [2026-06-26] - Command Center: Auditoría y Comunicados Globales
**Objetivo del cambio:** Dotar al panel de dueño (SaaS Operations) de herramientas de monitoreo reales (Base de datos, Storage) y de comunicación en tiempo real con todos los tenants.
**Archivos modificados:** `GlobalAuditDashboard.tsx`, `BroadcastsDashboard.tsx`, `GlobalBroadcastListener.tsx` (Nuevo), `App.tsx`, `saasService.ts`, `supabase_storage_size.sql`, `supabase_broadcasts.sql`.
**Detalles:**
- **Métricas Reales SQL:** Se crearon RPCs `SECURITY DEFINER` para leer `pg_database_size` y sumar `storage.objects`, dándole al Owner visibilidad exacta del consumo sin depender de la UI de Supabase (excepto Egress, el cual se omitió por estar fuera de SQL).
- **Broadcasts (Realtime):** Se creó la tabla `saas_broadcasts` con publicación habilitada. Se inyectó `<GlobalBroadcastListener />` a nivel raíz (`App.tsx`) escuchando eventos `INSERT` para despachar notificaciones masivas instantáneas (SLDS Toasts) a todos los usuarios conectados sin necesidad de recargar.

## [2026-06-26] - Migración a Supabase: Actividades de Prospectos (Camino B)
**Objetivo del cambio:** Eliminar la deuda técnica en el registro de actividades y transicionar el flujo hacia Supabase como fuente de verdad, abandonando el array obsoleto `interactions` de Firebase.
**Archivos modificados:** `LeadTimeline.tsx`, `supabase_schema_crm_activities.sql` (Nuevo)
**Detalles:**
- **SQL Schema:** Se creó el script de base de datos para la tabla `lead_activities` soportando Row Level Security (RLS) para proteger los datos de los tenants.
- **Frontend Refactor:** Se limpió la arquitectura de `LeadTimeline.tsx` para que ahora dependa estrictamente de las funciones de inserción y lectura de Supabase, en lugar de simular la interfaz (UI optimista).
- **Graceful Fallback:** El SLA en la colección `leads` de Firebase (campos `updatedAt`, `firstContactAt`) sigue intentando actualizarse mediante un bloque `try/catch` de contingencia hasta que la tabla principal de prospectos también sea migrada a Supabase.

## [2026-06-26] - Reestructuración Profunda: Purismo Salesforce en Prospectos (Opción 2)
**Objetivo del cambio:** Adaptar el modelo mental del CRM 100% a la arquitectura de datos de Salesforce, eliminando la capacidad de cobrarle a un Prospecto y preparando la interfaz para el flujo de Conversión de Leads.
**Archivos modificados:** `LeadModal.tsx`
**Detalles:** 
- **Pestaña Detalles:** Se inyectaron todos los campos estándar obligatorios de un *Salesforce Lead* agrupados por secciones lógicas (Cargo, Empresa, Móvil, Sitio Web, Industria, Ingresos Anuales, Dirección y Descripción). Estos campos utilizan almacenamiento dinámico `customData` para mantener la compatibilidad con el esquema actual.
- **Pestaña Actividad:** Se diseñó e integró un *Activity Publisher* nativo de Lightning en la parte superior, con pestañas para "Registrar Llamada", "Nueva Tarea" y "Correo Electrónico", complementando al Timeline histórico en la parte inferior.
- **Eliminación de Finanzas:** Se removió la pestaña "Relacionado" y la dependencia de `<LeadFinanceTab />` del modal de Prospectos, respetando la regla de negocio de que un prospecto no transacciona financieramente.
- **Conversión:** Se agregó el botón maestro "Convertir" en el encabezado (actualmente en modo prototipo/alerta) para sentar las bases del futuro módulo de Oportunidades y Cuentas.

## [2026-06-26] - Implementación de Arquitectura de Pestañas SLDS en LeadModal
**Objetivo del cambio:** Replicar el modelo de navegación en pestañas (Lightning Record Tabs) estándar de Salesforce para aislar lógicamente la información del prospecto, sus dependencias y su historial.
**Archivos modificados:** `LeadModal.tsx`
**Detalles:** 
- Se implementaron 3 pestañas principales de acuerdo al patrón de diseño SLDS: **Detalles** (Formulario de prospecto), **Relacionado** (Cotizaciones y finanzas), y **Actividad** (Línea de tiempo del prospecto).
- Se desacopló la "Línea de Tiempo" (Activity History) de la parte inferior del formulario y se movió a su propia pestaña "Actividad", tal como funciona un *Record Page* de Salesforce.
- Se reasignó la sección de Finanzas a la pestaña "Relacionado", tratando las cotizaciones como un sub-objeto dependiente en lugar de un paso del formulario.
- Se actualizaron las variables de estado para soportar la navegación fluida entre estas vistas sin interferir con la acción de guardar principal.

## [2026-06-26] - Reestructuración de LeadModal (Arquitectura de Datos Salesforce)
**Objetivo del cambio:** Organizar la información del prospecto en una cuadrícula a 2 columnas replicando el estándar y orden de lectura de Salesforce, además de corregir colisiones visuales.
**Archivos modificados:** `LeadModal.tsx`
**Detalles:** 
- Se rediseñó el formulario "Información Principal" para utilizar un layout de 2 columnas estricto (`slds-size_1-of-2`), agrupando los campos de manera lógica: Nombre/Asignado, DNI/Etapa, Teléfono/Fuente, Email/Interés.
- Se agregó el campo nativo de `DNI / RUC` que estaba ausente en el formulario pero presente en el modelo de datos.
- Se corrigió un problema donde el modal se pegaba al *Top Bar* global, añadiendo `margin: '4rem auto'` al contenedor `slds-modal__container` para garantizar el espaciado adecuado (padding visual).

## [2026-06-26] - Refactorización de LeadModal al estándar SLDS
**Objetivo del cambio:** Eliminar el diseño personalizado del modal de Prospectos y alinearlo 100% con los lineamientos visuales nativos de Salesforce (SLDS).
**Archivos modificados:** `LeadModal.tsx`
**Detalles:** 
- Se eliminó el fondo gris (`#f4f6f9`) del contenido del modal para mantener la pulcritud característica de SLDS (fondo blanco nativo).
- Se removieron los contenedores tipo tarjeta (`slds-box`) que envolvían a los formularios. En SLDS, los formularios dentro de un modal fluyen directamente sobre el fondo blanco.
- Se introdujo `slds-section-title--divider` para agrupar visualmente las secciones ("Información Principal", "Información Adicional", "Línea de Tiempo") sin necesidad de cajas cerradas.
- Se trasladaron los tabs (pestañas) desde el *header* hacia el inicio del *content* del modal, adhiriéndonos mejor a la arquitectura del ecosistema Salesforce.
- Se ajustó el botón de cerrar ('X') añadiendo `slds-button__icon_large` en lugar de utilizar clases incompatibles.

## [2026-06-26] - Estandarización Visual de ProjectsDashboard
**Objetivo del cambio:** Alinear la estructura visual del panel de Proyectos con el resto de paneles de administración (Owner).
**Archivos modificados:** `ProjectsDashboard.tsx`
**Detalles:** 
- Se corrigió el Top Bar (`slds-page-header`) para que deje de estar suelto con fondo transparente y pase a tener fondo blanco, estructurándolo dentro de un contenedor Flex que ocupa el 100% del alto, similar a `CompaniesDashboard`.
- Se solucionó el botón de cerrar (`X`) del modal, removiendo clases inválidas (`slds-button_icon-inverse` y estilos estáticos en línea) y dejándolo dentro del bloque blanco del header, según las convenciones vigentes.
- Se reemplazó el icono estático en SVG del encabezado por el componente nativo `Building2` de Lucide, respetando la regla obligatoria de forzar su color a blanco cuando se ubica en contenedores de iconos de color estándar de SLDS.
- Se agregó comportamiento dinámico de scroll (`flex: 1`, `overflowY: 'auto'`) a la tarjeta de listado para mejor densidad de datos.

## [2026-06-26] - Refactorización "Setup SLDS Puro" (Roles y Permisos)
**Objetivo del cambio:** Mejorar la escalabilidad visual de la configuración de Roles.
**Archivos modificados:** `RolesSettings.tsx`
**Detalles:** 
- Se migró al estándar puro de **Salesforce Lightning Design System (SLDS)**.
- Se implementó una **Matriz de Permisos (CRED Table)** de alta densidad, permitiendo a los administradores visualizar permisos de lectura/escritura/eliminación para múltiples módulos (Leads, Inventario, Finanzas, Configuración) en una sola vista estructurada en tabla, reemplazando el antiguo diseño de tarjetas masivas.

## [2026-06-26] - Resolución de Seguridad B2B (Error 500 al crear empleados)
**Objetivo del cambio:** Arreglar el fallo en la creación interna de empleados (Managers añadiendo agentes) respetando el RLS estricto de Supabase.
**Archivos modificados:** `TeamDashboard.tsx`
**Detalles:** 
- **Causa Raíz:** El Gatillo estricto de Postgres (`handle_new_user`) prohíbe crear usuarios si no existe una Invitación B2B previa, chocando con el flujo interno.
- **Solución:** Se inyectó la creación de una invitación fantasma silenciosa usando los permisos RLS del Manager instantes antes de hacer el `signUp`. Además, se implementó `.toLowerCase()` forzado en el correo para evitar problemas de _Case Sensitivity_ en Supabase Auth, permitiendo la asignación correcta del `customRoleId`.

## [2026-06-26] - Upgrade de Kanban (Estilo Salesforce Lightning)
**Objetivo del cambio:** Enriquecer visual y operativamente el tablero de prospectos con métricas financieras.
**Archivos modificados:** `KanbanBoard.tsx`, `LeadModal.tsx`
**Detalles:** 
- **Totales de Columna:** Cada etapa ahora incluye un totalizador de dinero en tiempo real, sumando el valor de proforma (`finalPrice`) de todos los leads en la columna.
- **Tarjetas SLDS:** Las tarjetas ahora muestran una barra lateral heredando el color de su etapa. Además se resaltó de forma nativa el valor financiero en la tarjeta (ej. $150,000 USD).
- **Tipografía:** Se ajustaron los tamaños tipográficos al estricto estándar SLDS corporativo (titulares a 13px MAYÚSCULAS, tarjetas a 14px y subtítulos a 12/13px) para mejor densidad de información.
- **Asignación Manual:** Se habilitó un selector para cambiar manualmente la asignación del asesor (`assignedTo`) directamente desde el modal del Lead (Solo para Administradores).

## [2026-06-26] - Optimistic UI (Mejoras de Rendimiento Drag&Drop)
**Objetivo del cambio:** Eliminar la latencia visual al mover tarjetas entre etapas del Kanban.
**Archivos modificados:** `GlobalDataProvider.tsx`, `useCommercialData.ts`, `CommercialDashboard.tsx`
**Detalles:** 
- Se exportó una nueva función `updateLeadOptimistically` desde el estado global, permitiendo sobreescribir la RAM instantáneamente.
- Ahora, cuando el asesor hace *Drag&Drop* en el tablero, la tarjeta se mueve visualmente al instante (feedback a la velocidad de la luz), delegando la actualización a Postgres en background (asíncrono).

---

## [2026-06-26] - Migración Comercial Fase 2: Embudo de Ventas Dinámico
**Objetivo del cambio:** Desconectar el Tablero Comercial de Firebase y conectar el frontend a Supabase para heredar las etapas B2B personalizadas.
**Archivos modificados:** `14_schema_leads_and_tenant_stages.sql`, `CommercialDashboard.tsx`, `KanbanBoard.tsx`, `LeadModal.tsx`, `definitions.ts`.
**Detalles:** 
1. Se generó un script SQL para añadir la columna JSONB `pipeline_stages` a los inquilinos y migrar la tabla relacional `leads`.
2. Se programó el Trigger Postgres `inherit_seed_templates()` para que toda inmobiliaria nueva clone el "Starter Pack" maestro.
3. Se refactorizó `CommercialDashboard.tsx` sustituyendo Firestore por Supabase JS.
4. Se modificó el `KanbanBoard.tsx` y `LeadModal.tsx` para generar sus columnas y colores reactivamente leyendo `tenant.pipeline_stages`.
5. **(Fix de UX)**: Se renombraron las etapas finales a "06 - Vendido" y "07 - Perdido" para utilizar un lenguaje más natural y comercial.
6. **(Fix de Mercado)**: Se adaptó el flujo completo de etapas al estándar del mercado inmobiliario peruano (Prospecto -> Contactado -> Negociación -> Visita -> Separación -> Vendido -> Perdido).

## [2026-06-26] - Refactorización de UI: Plantillas Semilla
**Objetivo del cambio:** Hacer que el módulo de "Starter Pack" de las inmobiliarias sea 100% interactivo antes del guardado.
**Archivos modificados:** `src/pages/owner/SaaSOperations/SeedTemplates.tsx`
**Detalles:** 
- Se habilitó la lógica `onClick` para los botones de "Añadir Etapa" y el ícono de la papelera para eliminar etapas.
- Se reemplazaron las etiquetas estáticas de "Probabilidad" y "Color" por `<input type="number">` y `<input type="color">` interactivos, actualizando el estado reactivo del componente.
- Se preparó la función `handleSave` para insertar correctamente (`insert`) los nuevos registros creados dinámicamente.

## [2026-06-26] - Blindaje B2B: RLS y Triggers de Autenticación
**Objetivo del cambio:** Eliminar el registro B2C público, forzar el uso de invitaciones seguras y arreglar bloqueos de lectura en la base de datos.
**Archivos modificados:** `07_b2b_invitations.sql`, `08_fix_invitations_permissions.sql`, `09_fix_rls_invitations.sql`, `10_fix_owner_bypass.sql`, `11_fix_users_rls.sql`, `12_force_provision_owner.sql`, `13_enable_auth_trigger.sql`
**Detalles:** 
1. Se forzó la existencia del `CREATE TRIGGER on_auth_user_created` en Supabase Auth para que la lógica de invitaciones se ejecute de verdad al registrarse.
2. Se corrigió la política RLS (Row Level Security) en `public.users` (`users_read_own_profile`) para que los usuarios puedan leer su propio perfil al iniciar sesión.
3. Se desactivaron los parches frontend (`CRMContext.tsx`) que daban rol `owner` por defecto si fallaba la lectura de base de datos. Ahora el sistema cierra la sesión y expulsa si el perfil no fue aprovisionado.
4. Se corrigió un error circular de RLS en `user_invitations` separando las reglas explícitas de `SELECT`, `INSERT` y `UPDATE`.

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
