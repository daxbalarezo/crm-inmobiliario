-- Archivo: supabase_schema_crm_tasks.sql
-- Propósito: Expandir la tabla de actividades para soportar Tareas Pendientes con Vencimiento

-- 1. Añadir nuevas columnas a la tabla existente
ALTER TABLE public.lead_activities
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

-- 2. Habilitar la política de UPDATE (Solo para marcar como completado)
-- Los usuarios solo pueden actualizar si pertenecen al tenant y si solo cambian el estado a 'completed'

DROP POLICY IF EXISTS "Users can update activities of their tenant" ON public.lead_activities;
CREATE POLICY "Users can update activities of their tenant"
ON public.lead_activities
FOR UPDATE
USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE uid = auth.uid())
)
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE uid = auth.uid()) 
  AND status = 'completed'
);
