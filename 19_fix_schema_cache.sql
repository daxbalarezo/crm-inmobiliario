-- 1. Asegurar que la columna notes exista en la tabla leads (en caso de que la migración 14 no se haya completado o haya fallado)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Asegurar que las políticas RLS de units sean correctas para que no tire error 400
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Units read isolation per tenant" ON public.units;
CREATE POLICY "Units read isolation per tenant" 
ON public.units FOR SELECT TO authenticated 
USING (
  tenant_id = (SELECT tenant_id FROM public.users WHERE uid = auth.uid())
);

-- 3. Recargar la caché de esquema de la API (ESTO SOLUCIONA EL ERROR "Could not find the 'notes' column... in the schema cache")
NOTIFY pgrst, 'reload schema';
