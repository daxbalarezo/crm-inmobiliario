-- ==============================================================================
-- AUTOMATIZACIÓN DE COBROS Y BLOQUEO SUAVE
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- IMPORTANTE: Para que pg_cron funcione, asegúrate de tener la extensión "pg_cron" activada en tu proyecto de Supabase (Database -> Extensions -> pg_cron).
-- ==============================================================================

-- 1. Trigger para propagar el estado de la suscripción hacia la Inmobiliaria (Bloqueo Suave)
CREATE OR REPLACE FUNCTION public.sync_tenant_status_with_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la suscripción pasa a morosa o cancelada, suspendemos la Inmobiliaria
  IF NEW.status IN ('past_due', 'canceled') AND (OLD.status IS NULL OR OLD.status NOT IN ('past_due', 'canceled')) THEN
    UPDATE public.tenants SET status = 'suspended' WHERE id = NEW.tenant_id;
  END IF;

  -- Si la suscripción vuelve a estar activa, reactivamos la Inmobiliaria
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    UPDATE public.tenants SET status = 'active' WHERE id = NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_status_changed ON public.saas_subscriptions;
CREATE TRIGGER on_subscription_status_changed
  AFTER UPDATE OF status ON public.saas_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_status_with_subscription();


-- 2. Habilitar pg_cron (por si no está habilitado)
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- 3. Programar la tarea diaria de verificación de vencimientos
-- Esta tarea correrá todos los días a las 00:00 (medianoche)
SELECT cron.schedule(
  'check-expired-subscriptions',
  '0 0 * * *',
  $$
    UPDATE public.saas_subscriptions
    SET status = 'past_due'
    WHERE status = 'active' 
      AND current_period_end < NOW() - INTERVAL '1 day';
  $$
);
