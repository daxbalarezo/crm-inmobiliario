-- 1. Actualizar las plantillas maestras para usar los nuevos nombres más comerciales
UPDATE public.saas_seed_templates SET name = '06 - Vendido' WHERE name = '06 - Cerrado Ganado' OR name = '06 - Closed Won';
UPDATE public.saas_seed_templates SET name = '07 - Perdido' WHERE name = '07 - Cerrado Perdido' OR name = '07 - Closed Lost';

-- 2. Refrescar los tableros de todas las inmobiliarias (Tenants) para que hereden los nombres actualizados
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
