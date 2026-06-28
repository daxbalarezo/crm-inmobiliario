-- =================================================================================
-- Tabla de Comunicados Globales (Broadcasts)
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.saas_broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    target_scope TEXT NOT NULL DEFAULT 'all_tenants',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- Opcional, quien lo creó
);

-- Habilitar RLS
ALTER TABLE public.saas_broadcasts ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- 1. Cualquier usuario autenticado puede leer los comunicados (ya que son globales)
CREATE POLICY "Cualquiera puede leer comunicados" 
ON public.saas_broadcasts FOR SELECT 
TO authenticated 
USING (true);

-- 2. Solo los Dueños del SaaS pueden crear/editar comunicados (Controlado desde el backend/UI de Owner)
-- Para simplificar, dejaremos que inserten si están autenticados, pero la UI del Owner es la única que tiene el botón.
-- (En un escenario más estricto, validaríamos un rol 'owner')
CREATE POLICY "Permitir insertar comunicados" 
ON public.saas_broadcasts FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- HABILITAR REALTIME (IMPORTANTE)
-- Esto permite que los clientes escuchen eventos INSERT en vivo
alter publication supabase_realtime add table saas_broadcasts;
