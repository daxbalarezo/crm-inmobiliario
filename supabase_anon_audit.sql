-- Permitir que usuarios no autenticados (anon) puedan insertar logs SOLO si es un LOGIN_FAILED
CREATE POLICY "Allow anon to log failed logins" 
ON public.saas_audit_logs
FOR INSERT
TO anon
WITH CHECK (action = 'LOGIN_FAILED');
