-- ==============================================================================
-- FIX: Permisos y Extensiones para Invitaciones
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Asegurar que la extensión para generar tokens criptográficos esté activa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Asegurar que los usuarios autenticados puedan interactuar con la tabla a través de la API
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_invitations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_invitations TO service_role;
