-- ==========================================
-- SCRIPT: supabase_schema_crm_leads.sql
-- DESCRIPCIÓN: Crea la tabla principal de prospectos (leads)
-- con soporte Multi-Tenant (RLS) y referencias a users/projects.
-- ==========================================

-- 1. Crear la tabla principal 'leads'
DROP TABLE IF EXISTS public.leads CASCADE;

CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.users(uid) ON DELETE SET NULL,
    
    -- Información de Contacto
    name VARCHAR NOT NULL,
    phone VARCHAR,
    email VARCHAR,
    dni VARCHAR,
    
    -- Gestión Comercial
    source VARCHAR DEFAULT 'Orgánico',
    status VARCHAR DEFAULT 'PROSPECTO',
    interest_level VARCHAR DEFAULT 'Medio',
    
    -- Seguimiento (Campos Legacy / Temporales hasta completar migración a lead_activities)
    interactions JSONB DEFAULT '[]'::jsonb,
    next_follow_up_date TIMESTAMPTZ,
    next_follow_up_note TEXT,
    last_campaign_date TIMESTAMPTZ,
    contact_date TIMESTAMPTZ,
    first_contact_at TIMESTAMPTZ,
    
    -- Negocio y Conversión
    saved_proforma JSONB,
    loss_reason TEXT,
    custom_data JSONB DEFAULT '{}'::jsonb,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices de rendimiento (Performance)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON public.leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- 3. Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política: Los dueños (owner) pueden leer TODOS los leads (SaaS Admin)
CREATE POLICY "Owner read all leads" 
ON public.leads 
FOR SELECT 
USING (
    (SELECT role FROM public.users WHERE uid = auth.uid()) = 'owner'
);

-- Política: Lectura de Leads (Managers y Agents solo ven los de su Inmobiliaria)
CREATE POLICY "Tenant users can view their own leads" 
ON public.leads 
FOR SELECT 
USING (
    tenant_id = public.get_auth_tenant_id()
);

-- Política: Inserción de Leads
CREATE POLICY "Tenant users can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (
    tenant_id = public.get_auth_tenant_id()
);

-- Política: Actualización de Leads
CREATE POLICY "Tenant users can update their leads" 
ON public.leads 
FOR UPDATE 
USING (
    tenant_id = public.get_auth_tenant_id()
);

-- Política: Eliminación de Leads
CREATE POLICY "Tenant users can delete their leads" 
ON public.leads 
FOR DELETE 
USING (
    tenant_id = public.get_auth_tenant_id()
);

-- 4. Trigger para auto-actualizar el campo updated_at
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();

-- 5. Función RPC auxiliar para sembrado de datos (Opcional, para saltar RLS si es necesario)
-- (El data seeder del frontend usará inserción directa con el token del usuario actual)
