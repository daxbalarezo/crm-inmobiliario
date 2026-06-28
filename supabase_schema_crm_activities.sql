-- 1. Crear la tabla de Actividades de Prospectos (Lead Activities)
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL, -- Por ahora no es foreign key fuerte si leads aún está en Firebase
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para consultas rápidas por Tenant y Lead
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant_lead ON public.lead_activities(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- 3. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- 4. Crear Políticas de Seguridad (Policies)
-- Política: Los usuarios solo pueden ver y crear actividades si pertenecen a su Tenant (Inmobiliaria)
-- Asumiendo que el tenant_id viaja en el app_metadata del JWT (Estándar del Owner Dashboard en este CRM)

DROP POLICY IF EXISTS "Users can view activities of their tenant" ON public.lead_activities;
CREATE POLICY "Users can view activities of their tenant"
ON public.lead_activities
FOR SELECT
USING (tenant_id::text = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::text);

DROP POLICY IF EXISTS "Users can insert activities to their tenant" ON public.lead_activities;
CREATE POLICY "Users can insert activities to their tenant"
ON public.lead_activities
FOR INSERT
WITH CHECK (tenant_id::text = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::text);

-- Nota: Generalmente las actividades (logs/notas) no se editan ni eliminan por compliance de ventas.
-- Por lo que NO habilitamos políticas de UPDATE ni DELETE para vendedores.
