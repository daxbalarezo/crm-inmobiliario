-- 1. Actualizar las plantillas maestras a español
UPDATE public.saas_seed_templates SET name = '01 - Prospecto' WHERE name = '01 - Prospecting';
UPDATE public.saas_seed_templates SET name = '02 - Calificación' WHERE name = '02 - Qualification';
UPDATE public.saas_seed_templates SET name = '03 - Análisis de Necesidades' WHERE name = '03 - Needs Analysis';
UPDATE public.saas_seed_templates SET name = '04 - Propuesta de Valor' WHERE name = '04 - Value Proposition';
UPDATE public.saas_seed_templates SET name = '05 - Negociación' WHERE name = '05 - Negotiation/Review';
UPDATE public.saas_seed_templates SET name = '06 - Cerrado Ganado' WHERE name = '06 - Closed Won';
UPDATE public.saas_seed_templates SET name = '07 - Cerrado Perdido' WHERE name = '07 - Closed Lost';

-- 2. Refrescar los tableros de todas las inmobiliarias (Tenants) para que hereden los nombres en español
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
WHERE pipeline_stages IS NOT NULL;
