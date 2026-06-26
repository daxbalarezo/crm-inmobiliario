-- ==============================================================================
-- MIGRACIÓN A MODELO B2B (Solo Invitaciones)
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Crear tabla de invitaciones
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'manager',
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Habilitar Seguridad (RLS) en las invitaciones
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Owner puede gestionar todas las invitaciones
CREATE POLICY "owner_invitations_policy" 
ON public.user_invitations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() AND role = 'owner'
  )
);

-- Manager puede gestionar las invitaciones de su propia inmobiliaria
CREATE POLICY "manager_invitations_policy" 
ON public.user_invitations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE uid = auth.uid() AND role = 'manager' AND tenant_id = user_invitations.tenant_id
  )
);

-- 3. Actualizar el Trigger de Autenticación para bloquear registros sin invitación
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_invitation_id UUID;
BEGIN
  -- A. Owner Bypass (Dueños de la plataforma no necesitan invitación)
  IF NEW.email IN ('dbalarezo15@gmail.com') THEN
    INSERT INTO public.users (uid, email, name, role, tenant_id)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'SaaS Owner'), 
      'owner', 
      NULL
    );
    RETURN NEW;
  END IF;

  -- B. Verificación B2B (Se requiere Invitación obligatoria)
  SELECT id, tenant_id, role INTO v_invitation_id, v_tenant_id, v_role
  FROM public.user_invitations
  WHERE token = NEW.raw_user_meta_data->>'invitation_token'
    AND email = NEW.email
    AND used = false
    AND expires_at > NOW();

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Registro B2B Denegado: Se requiere una invitación oficial válida y vigente para este correo (%). No se admiten registros públicos.', NEW.email;
  END IF;

  -- C. Marcar la invitación como usada para que no se pueda re-utilizar
  UPDATE public.user_invitations SET used = true WHERE id = v_invitation_id;

  -- D. Insertar al usuario en la Inmobiliaria (Tenant) correcta
  INSERT INTO public.users (uid, email, name, role, tenant_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
    v_role, 
    v_tenant_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
