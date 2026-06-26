-- 1. Actualizar las plantillas maestras quitando el prefijo numérico (ej: "01 - ")
UPDATE public.saas_seed_templates SET name = 'Prospecto' WHERE name LIKE '%Prospecto';
UPDATE public.saas_seed_templates SET name = 'Contactado' WHERE name LIKE '%Contactado';
UPDATE public.saas_seed_templates SET name = 'Negociación' WHERE name LIKE '%Negociación';
UPDATE public.saas_seed_templates SET name = 'Visita' WHERE name LIKE '%Visita';
UPDATE public.saas_seed_templates SET name = 'Separación' WHERE name LIKE '%Separación';
UPDATE public.saas_seed_templates SET name = 'Vendido' WHERE name LIKE '%Vendido';
UPDATE public.saas_seed_templates SET name = 'Perdido' WHERE name LIKE '%Perdido';

-- 2. Refrescar los tableros de todas las inmobiliarias (Tenants) para que hereden los nombres limpios
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
