-- ==============================================================================
-- 20_create_roles_table.sql
-- Crea la tabla de Roles en Supabase PostgreSQL para migrar desde Firebase
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Tenants can view their own roles"
ON public.roles FOR SELECT
USING (tenant_id IN (
    SELECT tenant_id FROM public.users WHERE uid = auth.uid()
));

CREATE POLICY "Managers can insert roles"
ON public.roles FOR INSERT
WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.users WHERE uid = auth.uid() AND (role = 'manager' OR role = 'owner')
));

CREATE POLICY "Managers can update their roles"
ON public.roles FOR UPDATE
USING (tenant_id IN (
    SELECT tenant_id FROM public.users WHERE uid = auth.uid() AND (role = 'manager' OR role = 'owner')
));

CREATE POLICY "Managers can delete their roles"
ON public.roles FOR DELETE
USING (tenant_id IN (
    SELECT tenant_id FROM public.users WHERE uid = auth.uid() AND (role = 'manager' OR role = 'owner')
));

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_roles_updated_at ON public.roles;
CREATE TRIGGER set_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Opcional: Insertar un Rol por defecto si no existe (Manager)
-- Esto no es estrictamente necesario, pero ayuda.
