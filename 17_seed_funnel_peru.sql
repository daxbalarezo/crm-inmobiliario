-- 1. Vaciar las plantillas semilla antiguas de tipo pipeline
DELETE FROM public.saas_seed_templates WHERE type = 'pipeline_stage';

-- 2. Insertar el embudo oficial adaptado al mercado inmobiliario (flujo Perú)
INSERT INTO public.saas_seed_templates (type, name, description, config_json)
VALUES 
    ('pipeline_stage', '01 - Prospecto', 'Lead nuevo recién ingresado', '{"probability": 10, "color": "#0176D3", "order": 1}'::jsonb),
    ('pipeline_stage', '02 - Contactado', 'Primer acercamiento por llamada o WhatsApp', '{"probability": 20, "color": "#0176D3", "order": 2}'::jsonb),
    ('pipeline_stage', '03 - Negociación', 'Discusión de precios, cuotas y crédito antes de la visita', '{"probability": 40, "color": "#FE9339", "order": 3}'::jsonb),
    ('pipeline_stage', '04 - Visita', 'Cita presencial en el proyecto o piloto', '{"probability": 70, "color": "#0176D3", "order": 4}'::jsonb),
    ('pipeline_stage', '05 - Separación', 'El cliente pagó el adelanto para bloquear la unidad', '{"probability": 90, "color": "#0176D3", "order": 5}'::jsonb),
    ('pipeline_stage', '06 - Vendido', 'Reserva pagada y contrato firmado', '{"probability": 100, "color": "#2E844A", "order": 6, "is_closed": true}'::jsonb),
    ('pipeline_stage', '07 - Perdido', 'Venta perdida o cliente descartado', '{"probability": 0, "color": "#BA0517", "order": 7, "is_closed": true}'::jsonb);

-- 3. Actualizar TODAS las inmobiliarias para que adopten este nuevo flujo de inmediato
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
);
