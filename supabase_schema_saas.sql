-- ==============================================================================
-- CRM Inmobiliario V2 - Módulo Owner (SaaS)
-- Script de Creación de Esquema Inicial
-- Instrucciones: Ejecuta este script en la consola SQL de tu Supabase.
-- ==============================================================================

-- 1. Tenants (Inmobiliarias)
-- La tabla central que representa a cada negocio (B2B).
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    plan_id TEXT DEFAULT 'starter',
    billing_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SaaS Plans (Configuración de Planes Comerciales)
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id TEXT PRIMARY KEY, -- ej: 'starter', 'pro', 'enterprise'
    name TEXT NOT NULL,
    price_monthly NUMERIC(10, 2) NOT NULL,
    max_users INTEGER NOT NULL,
    max_projects INTEGER NOT NULL,
    features_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SaaS Subscriptions (Facturación y Pagos Manuales)
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.saas_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'pending_verification')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    mrr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SaaS Seed Templates (Plantillas Globales)
CREATE TABLE IF NOT EXISTS public.saas_seed_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('pipeline_stage', 'sla_rule')),
    name TEXT NOT NULL,
    description TEXT,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SaaS Broadcasts (Comunicados Globales)
CREATE TABLE IF NOT EXISTS public.saas_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    target_scope TEXT NOT NULL DEFAULT 'all_tenants' CHECK (target_scope IN ('all_tenants', 'active_only', 'admins_only')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Audit Logs (Registro Inmutable Global)
CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL, -- Puede ser null si la acción es a nivel global
    user_id UUID, -- Quien ejecutó la acción (id de auth.users)
    action TEXT NOT NULL, -- ej: 'tenant_created', 'tenant_suspended'
    entity_type TEXT NOT NULL, -- ej: 'tenant', 'plan', 'billing'
    details_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INSERCIÓN DE DATOS SEMILLA (PLANTS INICIALES)
-- ==============================================================================

-- Insertar planes por defecto
INSERT INTO public.saas_plans (id, name, price_monthly, max_users, max_projects, features_json)
VALUES 
    ('starter', 'Starter', 0.00, 3, 1, '{"support": "email"}'::jsonb),
    ('pro', 'Pro', 99.00, 10, 5, '{"support": "priority"}'::jsonb),
    ('enterprise', 'Enterprise', 299.00, 999, 999, '{"support": "24/7"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insertar plantillas semilla (Pipeline Standard Salesforce)
INSERT INTO public.saas_seed_templates (type, name, description, config_json)
VALUES 
    ('pipeline_stage', '01 - Prospecting', 'Búsqueda e identificación inicial', '{"probability": 10, "color": "#0176D3", "order": 1}'::jsonb),
    ('pipeline_stage', '02 - Qualification', 'Evaluación de interés y presupuesto', '{"probability": 20, "color": "#0176D3", "order": 2}'::jsonb),
    ('pipeline_stage', '03 - Needs Analysis', 'Reunión/Visita para entender necesidades', '{"probability": 30, "color": "#0176D3", "order": 3}'::jsonb),
    ('pipeline_stage', '04 - Value Proposition', 'Presentación de propuesta/cotización', '{"probability": 50, "color": "#0176D3", "order": 4}'::jsonb),
    ('pipeline_stage', '05 - Negotiation/Review', 'Negociación de términos', '{"probability": 70, "color": "#FE9339", "order": 5}'::jsonb),
    ('pipeline_stage', '06 - Closed Won', 'Reserva pagada y contrato firmado', '{"probability": 100, "color": "#2E844A", "order": 6, "is_closed": true}'::jsonb),
    ('pipeline_stage', '07 - Closed Lost', 'Venta perdida', '{"probability": 0, "color": "#BA0517", "order": 7, "is_closed": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- POLÍTICAS RLS (Row Level Security) - SEGURIDAD
-- Por ahora, abrimos el acceso asumiendo que el middleware valida. En un entorno de 
-- producción estricto, aquí se añadirían las comprobaciones `auth.uid()`.
-- ==============================================================================

-- Habilitar RLS en tablas sensibles
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_seed_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

-- Crear políticas base (Para Owner/Admin - Simplificadas para esta etapa)
CREATE POLICY "Enable all for authenticated users" ON public.tenants FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.saas_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.saas_subscriptions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.saas_seed_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.saas_broadcasts FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.saas_audit_logs FOR ALL TO authenticated USING (true);
