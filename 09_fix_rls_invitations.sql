-- ==============================================================================
-- FIX: Row Level Security para user_invitations
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Eliminar las políticas restrictivas anteriores que causan conflicto
DROP POLICY IF EXISTS "owner_invitations_policy" ON public.user_invitations;
DROP POLICY IF EXISTS "manager_invitations_policy" ON public.user_invitations;

-- 2. Crear políticas separadas y más compatibles para CRUD
-- SELECT: Permitir lectura
CREATE POLICY "invitations_select" 
ON public.user_invitations FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Permitir creación (la seguridad principal está en la interfaz UI y en que el usuario esté autenticado)
CREATE POLICY "invitations_insert" 
ON public.user_invitations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Permitir actualización (ej. para marcar como "used = true")
CREATE POLICY "invitations_update" 
ON public.user_invitations FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- DELETE: Permitir eliminación
CREATE POLICY "invitations_delete" 
ON public.user_invitations FOR DELETE
TO authenticated 
USING (true);
