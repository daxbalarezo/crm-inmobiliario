-- ==============================================================================
-- FIX: Sincronización Automática de Suscripciones (Billing Dashboard)
-- Instrucciones: Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Función para crear suscripción automáticamente cuando se crea una Inmobiliaria
CREATE OR REPLACE FUNCTION public.create_subscription_for_tenant()
RETURNS TRIGGER AS $$
DECLARE
  plan_price NUMERIC;
BEGIN
  -- Obtener el precio del plan
  SELECT price_monthly INTO plan_price FROM public.saas_plans WHERE id = NEW.plan;
  
  -- Insertar la suscripción activa
  INSERT INTO public.saas_subscriptions (tenant_id, plan_id, status, mrr, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    NEW.plan,
    'active',
    COALESCE(plan_price, 0),
    NOW(),
    NOW() + INTERVAL '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger para insertar suscripción al crear tenant
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.create_subscription_for_tenant();


-- 3. Función para actualizar la suscripción si la inmobiliaria cambia de plan
CREATE OR REPLACE FUNCTION public.update_subscription_for_tenant()
RETURNS TRIGGER AS $$
DECLARE
  plan_price NUMERIC;
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    SELECT price_monthly INTO plan_price FROM public.saas_plans WHERE id = NEW.plan;
    
    UPDATE public.saas_subscriptions 
    SET plan_id = NEW.plan, mrr = COALESCE(plan_price, 0)
    WHERE tenant_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para actualizar suscripción al cambiar de plan
DROP TRIGGER IF EXISTS on_tenant_plan_updated ON public.tenants;
CREATE TRIGGER on_tenant_plan_updated
  AFTER UPDATE OF plan ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_subscription_for_tenant();


-- 5. BACKFILL: Crear suscripciones para todas las inmobiliarias existentes que no tengan una
INSERT INTO public.saas_subscriptions (tenant_id, plan_id, status, mrr, current_period_start, current_period_end)
SELECT 
    t.id as tenant_id,
    t.plan as plan_id,
    'active' as status,
    COALESCE(p.price_monthly, 0) as mrr,
    NOW() as current_period_start,
    NOW() + INTERVAL '1 month' as current_period_end
FROM public.tenants t
LEFT JOIN public.saas_plans p ON t.plan = p.id
WHERE t.id NOT IN (SELECT tenant_id FROM public.saas_subscriptions);
