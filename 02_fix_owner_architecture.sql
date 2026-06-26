-- ==============================================================================
-- FIX ARQUITECTÓNICO: Owner sin Tenant
-- Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Desvincular a cualquier usuario que esté atrapado en las inmobiliarias fantasma
-- (Los hacemos 'owner' asumiendo que eres tú probando con varios correos)
UPDATE public.users 
SET tenant_id = NULL, role = 'owner' 
WHERE tenant_id IN (
    SELECT id FROM public.tenants WHERE name = 'Administración Principal'
);

-- 2. Eliminar las inmobiliarias basura ("Administración Principal")
-- Esto borrará los tenants que se crearon por error al registrarte
DELETE FROM public.tenants 
WHERE name = 'Administración Principal';

-- 3. Reemplazar el Trigger de Autenticación
-- Modificamos la función para que discrimine entre el dueño del CRM y un cliente nuevo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  user_role TEXT := 'manager';
BEGIN
  -- Aquí definimos los correos de los dueños de la plataforma (SaaS Owners)
  IF NEW.email IN ('dbalarezo15@gmail.com') THEN
    
    -- Es un Dueño: No se le crea Inmobiliaria. Su tenant_id es NULL.
    INSERT INTO public.users (uid, email, name, role, tenant_id)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'SaaS Owner'), 
      'owner', 
      NULL
    );

  ELSE
    
    -- Es un Cliente (Manager): Se le crea una Inmobiliaria por defecto
    INSERT INTO public.tenants (name, plan) 
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'tenant_name', 'Inmobiliaria ' || split_part(NEW.email, '@', 1)), 
      'starter'
    ) 
    RETURNING id INTO new_tenant_id;
    
    -- Se vincula al manager con su nueva inmobiliaria
    INSERT INTO public.users (uid, email, name, role, tenant_id)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Gerente'), 
      'manager', 
      new_tenant_id
    );

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
