-- PARCHE DE SEGURIDAD (MIGRACIÓN EN CURSO)
-- Al parecer los asesores aún se loguean con Firebase Auth, 
-- por lo que Supabase no reconoce su JWT (tenant_id) todavía.

-- 1. Eliminamos las políticas estrictas que bloquean la inserción
DROP POLICY IF EXISTS "Users can view activities of their tenant" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can insert activities to their tenant" ON public.lead_activities;

-- 2. Creamos políticas de transición que permiten lectura y escritura temporalmente
-- Una vez que migres el Login de los Asesores a Supabase Auth, volveremos a restringir esto.
CREATE POLICY "Temporal Allow Select" ON public.lead_activities FOR SELECT USING (true);
CREATE POLICY "Temporal Allow Insert" ON public.lead_activities FOR INSERT WITH CHECK (true);
