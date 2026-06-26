-- ==============================================================================
-- FIX DEFINITIVO: Aprovisionamiento Forzado del Perfil de Dueño
-- Instrucciones: 
-- 1. Cambia 'TU_CORREO_AQUI@gmail.com' por el correo de tu cuenta de Google.
-- 2. Ejecuta este script en el SQL Editor de Supabase.
-- ==============================================================================

INSERT INTO public.users (uid, email, name, role, tenant_id)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'SaaS Owner'), 
    'owner', 
    NULL
FROM auth.users
WHERE email = 'TU_CORREO_AQUI@gmail.com' -- <-- CAMBIA ESTO POR TU CORREO REAL DE GOOGLE
ON CONFLICT (uid) DO UPDATE 
SET role = 'owner', tenant_id = NULL;
