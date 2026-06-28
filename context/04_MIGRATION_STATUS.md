# ESTADO ACTUAL DEL PROYECTO (Handover para Nueva Sesión)

Este documento resume los avances recientes y el estado actual de la migración para que la próxima sesión de IA (en tu PC principal) tenga el contexto exacto de dónde retomar.

## 1. Migración del Módulo Owner a Supabase (Completado)
Todo el **Módulo Owner** ha sido desconectado de los mockups en memoria y ahora está 100% conectado a **Supabase** mediante el servicio `src/services/saasService.ts`.

## 2. Refactorización del "Data Model" (Campos Personalizados)
Se eliminó Firebase del corazón del CRM. Ahora los campos dinámicos se guardan en la columna `fields` (tipo JSONB) dentro de la tabla `tenants` en Supabase.
- Archivo clave refactorizado: `useTenantSchema.ts`.
- Pantalla configuradora: `DataModelSettings.tsx` conectada a Supabase.

## 3. Avance Actual: Migración del CRM Core (ProjectsDashboard y Prospectos)
Comenzamos el "Camino B" (migrar el panel de proyectos y módulos core).
- `ProjectsDashboard.tsx` ya lee de Supabase usando `crmService.ts`.
- **Último hito (Dashboard Proyectos):** Se arregló la creación de `projects` garantizando la inyección correcta del `tenant_id` y solucionando la visualización.
- **Hito Actual (Prospectos):** 
  - Se re-arquitectó `LeadModal.tsx` con pestañas y un layout de 2 columnas tipo Salesforce.
  - Se migró el historial de actividades (`LeadTimeline.tsx`) a Supabase creando la tabla `lead_activities`.
  - **Evolución a Tareas Reales:** Se amplió `lead_activities` (script `supabase_schema_crm_tasks.sql`) con campos `due_date` y `status` para soportar Tareas Pendientes (To-Do list) con checkbox de completado.
  - Se reemplazó el canal "Correo" por "WhatsApp" en la interfaz.

**Próximos Pasos (En cola de espera para cuando el usuario lo autorice):**
1. Validar que la Inmobiliaria y el Proyecto se creen bien desde `CompaniesDashboard`.
2. Completar la migración de la entidad Principal de Prospectos creando el script SQL `supabase_schema_crm_leads.sql`.
3. Desacoplar completamente las consultas a `leads` (Prospectos) de Firebase y re-escribir `LeadModal.tsx` y `CommercialDashboard.tsx` para que consuman exclusivamente de Supabase.

## 4. Módulo Owner (Auditoría Global Completada)
- Se "dio vida" al Dashboard de Auditoría (`GlobalAuditDashboard.tsx`), instrumentando todo el módulo Owner (facturación, planes, comunicados) para guardar eventos en `saas_audit_logs`.
- Se configuró Supabase Realtime para que los KPIs del Owner se actualicen en vivo sin refrescar.
- Se introdujo el RPC `get_database_size_bytes` vía script SQL para leer el tamaño de disco en PostgreSQL de forma 100% real para el Owner.

## 5. Instrucciones de Estilo y Formato para la IA
Por instrucción del usuario, **DEBES** estructurar tus respuestas usando las siguientes etiquetas siempre que sea pertinente para mantener orden y claridad:
- **[TIPO DE INTERVENCIÓN]** (ej: Solución de Bug, Creación de Script, Refactorización)
- **[ANÁLISIS]** (Explicación técnica de por qué pasó o qué se va a hacer)
- **[ACCIÓN]** (El paso a paso o lo que ya se ejecutó en código)