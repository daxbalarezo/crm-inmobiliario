-- ==============================================================================
-- CRM Inmobiliario V2 - Módulo Negocio (Proyectos)
-- Script de Creación de Esquema Inicial
-- Instrucciones: Ejecuta este script en la consola SQL de tu Supabase.
-- ==============================================================================

-- 1. Projects (Proyectos Inmobiliarios)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- POLÍTICAS RLS (Row Level Security) - SEGURIDAD
-- ==============================================================================

-- Habilitar RLS en tabla projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Crear políticas base (Simplificadas, permite acceso a todos los autenticados, 
-- igual que el esquema SaaS actual)
CREATE POLICY "Enable all for authenticated users" ON public.projects FOR ALL TO authenticated USING (true);
