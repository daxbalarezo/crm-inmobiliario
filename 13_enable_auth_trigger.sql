-- ==============================================================================
-- FIX DEFINITIVO: Conectar el Gatillo de Auth con el Gestor de Invitaciones
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Asegurar que la función de manejo de usuarios tiene los permisos correctos
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

-- 2. Eliminar el gatillo si existe (para evitar duplicados)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Crear el gatillo que "escucha" cada vez que un usuario se registra
-- y ejecuta nuestra lógica de B2B (Invitaciones)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
