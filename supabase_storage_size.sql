-- =================================================================================
-- RPC para calcular el tamaño del Storage (Archivos) en tiempo real
-- =================================================================================

CREATE OR REPLACE FUNCTION public.get_storage_size_bytes()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = storage, public
AS $$
DECLARE
    total_size bigint;
BEGIN
    -- Suma el tamaño de todos los archivos guardados en los buckets de Supabase
    SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO total_size 
    FROM storage.objects;
    
    RETURN total_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storage_size_bytes() TO authenticated;
