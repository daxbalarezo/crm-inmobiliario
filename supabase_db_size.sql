-- =================================================================================
-- RPC para calcular el tamaño de la base de datos en tiempo real (Para el MVP)
-- =================================================================================

-- 1. Función con SECURITY DEFINER para que pueda leer las estadísticas internas
CREATE OR REPLACE FUNCTION public.get_database_size_bytes()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    db_size bigint;
BEGIN
    -- pg_database_size devuelve el tamaño en bytes de la base de datos actual
    SELECT pg_database_size(current_database()) INTO db_size;
    RETURN db_size;
END;
$$;

-- 2. Conceder permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_database_size_bytes() TO authenticated;
