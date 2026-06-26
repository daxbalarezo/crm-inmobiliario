-- ==============================================================================
-- FIX: Priorizar Invitación sobre Owner Bypass
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_invitation_id UUID;
BEGIN
  -- 1. Flujo Principal: Si el usuario trae un token, priorizamos la invitación B2B
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    
    SELECT id, tenant_id, role INTO v_invitation_id, v_tenant_id, v_role
    FROM public.user_invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND email = NEW.email
      AND used = false
      AND expires_at > NOW();

    IF v_invitation_id IS NULL THEN
      RAISE EXCEPTION 'Registro B2B Denegado: Invitación inválida o expirada para este correo (%).', NEW.email;
    END IF;

    UPDATE public.user_invitations SET used = true WHERE id = v_invitation_id;

    INSERT INTO public.users (uid, email, name, role, tenant_id)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
      v_role, 
      v_tenant_id
    );

    RETURN NEW;
  END IF;

  -- 2. Flujo de Respaldo: Owner Bypass (Solo si NO trae token y es un correo autorizado)
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

  -- 3. Si llega hasta aquí, es un intruso intentando registrarse sin invitación ni autorización
  RAISE EXCEPTION 'Registro B2B Denegado: Se requiere una invitación oficial válida y vigente. No se admiten registros públicos.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
