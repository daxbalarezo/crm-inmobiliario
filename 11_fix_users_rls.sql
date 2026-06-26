-- ==============================================================================
-- FIX: RLS de la tabla users (Perfiles)
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- Asegurar que RLS esté activo
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. Permitir que cada usuario autenticado pueda leer SU PROPIO perfil
DROP POLICY IF EXISTS "users_read_own_profile" ON public.users;
CREATE POLICY "users_read_own_profile" 
ON public.users FOR SELECT 
TO authenticated 
USING (uid = auth.uid());

-- 2. (Opcional) Si en el futuro necesitas que los dueños lean a todos los usuarios, puedes agregar:
-- CREATE POLICY "owner_read_all_users" ON public.users FOR SELECT TO authenticated USING (role = 'owner');
