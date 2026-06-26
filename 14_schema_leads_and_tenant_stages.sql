-- ==============================================================================
-- Migración Fase 2: Embudo de Ventas y Prospectos (Leads)
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Añadir columna JSONB para guardar el embudo personalizado de cada Inmobiliaria
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS pipeline_stages JSONB DEFAULT '[]'::jsonb;

-- 2. Función y Trigger: Cuando se crea una inmobiliaria, clona el "Starter Pack"
CREATE OR REPLACE FUNCTION public.inherit_seed_templates()
RETURNS TRIGGER AS $$
DECLARE
  v_stages JSONB;
BEGIN
  -- Construir el JSONB array ordenado a partir de las plantillas globales
  SELECT jsonb_agg(
           jsonb_build_object(
             'id', id,
             'name', name,
             'description', description,
             'probability', (config_json->>'probability')::int,
             'color', config_json->>'color',
             'order', (config_json->>'order')::int,
             'is_closed', (config_json->>'is_closed')::boolean
           ) ORDER BY (config_json->>'order')::int
         )
  INTO v_stages
  FROM public.saas_seed_templates
  WHERE type = 'pipeline_stage' AND is_active = true;

  -- Si hay etapas semilla, asignarlas a la columna del nuevo tenant
  IF v_stages IS NOT NULL THEN
    NEW.pipeline_stages = v_stages;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enchufar el trigger ANTES de que se inserte la fila en tenants
DROP TRIGGER IF EXISTS on_tenant_created_seed_templates ON public.tenants;
CREATE TRIGGER on_tenant_created_seed_templates
  BEFORE INSERT ON public.tenants
  FOR EACH ROW EXECUTE PROCEDURE public.inherit_seed_templates();

-- 3. Backfill para Inmobiliarias existentes (Para que tu perfil actual herede el embudo)
UPDATE public.tenants 
SET pipeline_stages = (
  SELECT jsonb_agg(
           jsonb_build_object(
             'id', id,
             'name', name,
             'description', description,
             'probability', (config_json->>'probability')::int,
             'color', config_json->>'color',
             'order', (config_json->>'order')::int,
             'is_closed', (config_json->>'is_closed')::boolean
           ) ORDER BY (config_json->>'order')::int
         )
  FROM public.saas_seed_templates
  WHERE type = 'pipeline_stage' AND is_active = true
)
WHERE pipeline_stages IS NULL OR pipeline_stages = '[]'::jsonb;

-- 4. Crear la tabla relacional de Prospectos (Leads)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    project_id TEXT, -- Puede conectarse con id de projects si existe
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL, -- Guarda el 'name' de la etapa del pipeline
    interest_level TEXT,
    notes TEXT,
    saved_proforma JSONB,
    first_contact_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Seguridad de Nivel de Fila (RLS) estricta para multi-tenancy
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leads isolation per tenant" ON public.leads;
CREATE POLICY "Leads isolation per tenant" 
ON public.leads FOR ALL TO authenticated 
USING (
  tenant_id = (SELECT tenant_id FROM public.users WHERE uid = auth.uid())
);
