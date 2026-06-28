# 04. REGISTRO DE DECISIONES ARQUITECTÓNICAS (ADRs)

## 1. Migración de Firebase a Supabase (Junio 2026)
**Contexto:** El CRM maneja relaciones complejas (Tenants -> Usuarios -> Leads -> Actividades -> Proyectos -> Propiedades). En Firebase (NoSQL), agregar analíticas avanzadas o filtrar inventario disponible resultaba en múltiples consultas pesadas y denormalización excesiva de datos.
**Decisión:** Migrar el backend a Supabase para aprovechar PostgreSQL.
**Beneficios:** Permite consultas relacionales complejas (`JOIN`), control estricto de seguridad con RLS a nivel de base de datos, y mayor escalabilidad empresarial.

## 2. Adopción Estricta de SLDS (Salesforce Lightning Design System)
**Contexto:** Se requiere un diseño que inspire confianza empresarial ("Enterprise"), idéntico al estándar corporativo, para evitar que la aplicación parezca "amateur". Inicialmente se combinaban herramientas.
**Decisión:** Eliminar TailwindCSS y forzar el uso nativo de SLDS.
**Beneficios:** Estandarización visual inmediata en toda la plataforma. Accesibilidad pre-configurada por los ingenieros de Salesforce.

## 3. Integración de SLDS en Vite (Prevención de MIME Type Errors)
**Contexto:** El uso de `vite-plugin-static-copy` para copiar los más de 5,000 archivos estáticos de SLDS causaba colisiones en el servidor de desarrollo, retornando errores `text/css` como módulo.
**Decisión:** Eliminar las copias estáticas e importar el archivo CSS principal directamente en `src/main.tsx` (`import '@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css'`).
**Beneficios:** Vite gestiona eficientemente el bundler del CSS, resolviendo rutas de imágenes y fuentes internamente, garantizando un servidor de desarrollo rápido y libre de cuelgues.

## 4. Integraciones "Plug & Play" (Webhooks Nativos vs Zapier/Make)
**Contexto:** El mercado local (inmobiliarias) es reacio a pagar y configurar middlewares de integración adicionales como Zapier o Make para la ingesta de leads.
**Decisión:** Dotar al CRM de su propio motor de ingestión mediante Webhooks nativos. Se generan URLs únicas de Webhook por Inmobiliaria (Tenant) para configurar directamente en Facebook Ads y proveedores de WABA (WhatsApp).
**Beneficios:** Reduce radicalmente la fricción de entrada (Onboarding), evita el "impuesto Zapier" al cliente final, y da control total al CRM sobre el embudo, permitiendo acoplar un motor interno de asignación automática de leads (Round-Robin).

## 5. Facturación y Cobranza Manual (Depósitos Bancarios)
**Contexto:** El mercado local aún tiene fricción con el cobro automático por tarjeta de crédito recurrente (Stripe/PayPal), prefiriendo en muchos casos transferencias o depósitos directos.
**Decisión:** El módulo de Facturación del SaaS (`owner`) se diseña asumiendo un flujo de validación manual. Las suscripciones tienen estados como "Esperando comprobante" o "Validando depósito".
**Beneficios:** Adaptación total a la realidad comercial de LATAM. Permite al Owner revisar los comprobantes enviados por WhatsApp o correo y aprobar la renovación de suscripción de la inmobiliaria manualmente con un clic, extendiendo el ciclo de facturación.
## 6. Evolución del Historial a un Sistema de Tareas Reales
**Contexto:** Inicialmente `lead_activities` solo registraba eventos pasados (inmutables). Se solicitó que "Nueva Tarea" se comporte como una verdadera lista de pendientes (To-Do List) con alertas/fechas, y que "Correo" se reemplace por "WhatsApp", por ser el canal predilecto de Latam.
**Decisión:** 
- Se expandió `lead_activities` con `due_date` y `status`.
- Las tareas programadas a futuro se guardan con `status='open'` y se renderizan en una sección superior "Próximos Pasos (Pendientes)".
- Se flexibilizó RLS (que antes prohibía UPDATE) para permitir que los asesores modifiquen sus propias filas **solamente** si el campo que actualizan es el `status` a `'completed'` (usando la cláusula `WITH CHECK`).
- Una vez marcadas con Checkbox, caen al historial permanente.
## 6. Purismo Salesforce en Prospectos (Eliminación de Finanzas)
**Contexto:** Inicialmente se diseñó el modal de Prospectos (Leads) incluyendo funcionalidades de cobros y pagos para intentar centralizar operaciones. Sin embargo, esto violaba el modelo de datos empresarial donde los pagos solo pertenecen a una "Oportunidad/Contrato".
**Decisión:** Implementar la "Opción 2 (Purismo)". Se eliminó por completo la pestaña de Finanzas de los Prospectos. Se implementó una botonera estándar de SLDS y se añadió el "Activity Publisher" nativo en la línea de tiempo. Las finanzas requerirán que el prospecto sea "Convertido".
**Beneficios:** Evita deuda técnica futura. Mantiene el modelo de datos escalable e idéntico a las mejores prácticas de Salesforce a nivel mundial.

## 7. Estrategia de Seguridad RLS basada en public.users
**Contexto:** Supabase permite incrustar datos en el JWT (app_metadata), pero la arquitectura actual del CRM utiliza la tabla `public.users` como fuente de verdad para gestionar los roles y la pertenencia a una inmobiliaria (`tenant_id`).
**Decisión:** Las políticas de Row Level Security (RLS) en Supabase para proteger los datos de inquilinos (Tenants) NO usarán `auth.jwt() -> app_metadata`. En su lugar, ejecutarán subconsultas contra `public.users` (ej: `tenant_id IN (SELECT tenant_id FROM public.users WHERE uid = auth.uid())`).
**Beneficios:** Mantiene la flexibilidad de cambiar a un usuario de inmobiliaria simplemente actualizando una fila en la base de datos, sin tener que forzar la rotación y regeneración de sus tokens JWT.

## 8. Dashboard de Auditoría y Uso de DB en Tiempo Real (Owner)
**Contexto:** Se necesitaba que el "Command Center" del dueño de la plataforma (Owner) muestre datos en vivo, incluyendo el Master Log de auditoría de las inmobiliarias y el % real de uso del disco de PostgreSQL, sin incurrir en costos extras ni arquitecturas complejas (como Edge Functions o llamadas a la Management API).
**Decisión:** 
- Para la auditoría de eventos SaaS (facturación, creación de planes, envío de comunicados), se instrumentó el código React para insertar registros directamente en `saas_audit_logs`.
- Para el uso del disco en tiempo real, se diseñó una función SQL RPC (`get_database_size_bytes`) con privilegios elevados (`SECURITY DEFINER`) que retorna `pg_database_size(current_database())` y se divide en el frontend entre un límite fijo (ej. 500MB).
**Beneficios:** Lectura 100% real y sin latencia de uso del almacenamiento nativo de Supabase sin requerir Management Tokens ni servidores backend, manteniéndose todo dentro del frontend con la SDK de Supabase.
