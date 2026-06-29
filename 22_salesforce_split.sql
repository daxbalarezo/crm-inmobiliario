-- 22_salesforce_split.sql

-- 1. Add lead_statuses column if it doesn't exist
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS lead_statuses JSONB DEFAULT '[]'::jsonb;

-- 2. Populate default lead_statuses and pipeline_stages for existing tenants
UPDATE public.tenants 
SET 
  lead_statuses = '[
    {"name": "NUEVO", "color": "#0176D3", "order": 1, "is_closed": false},
    {"name": "CONTACTADO", "color": "#005FB2", "order": 2, "is_closed": false},
    {"name": "DESCARTADO", "color": "#ea001e", "order": 3, "is_closed": true}
  ]'::jsonb
WHERE lead_statuses = '[]'::jsonb OR lead_statuses IS NULL;

-- 3. Populate pipeline_stages (Opportunities)
UPDATE public.tenants 
SET 
  pipeline_stages = '[
    {"name": "NEGOCIACION", "color": "#f28b02", "order": 1, "is_closed": false, "probability": 20},
    {"name": "VISITA", "color": "#7643b0", "order": 2, "is_closed": false, "probability": 40},
    {"name": "SEPARACION", "color": "#0176D3", "order": 3, "is_closed": false, "probability": 80},
    {"name": "VENDIDO", "color": "#45c65a", "order": 4, "is_closed": true, "probability": 100}
  ]'::jsonb;

-- 4. Update the stored procedure `convert_lead` to use the correct stage
CREATE OR REPLACE FUNCTION public.convert_lead(
    p_lead_id UUID,
    p_account_name TEXT,
    p_contact_first_name TEXT,
    p_contact_last_name TEXT,
    p_opportunity_name TEXT,
    p_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_tenant_id UUID;
    v_project_id UUID;
    v_assigned_to UUID;
    v_lead_name TEXT;
    
    v_account_id UUID;
    v_contact_id UUID;
    v_opportunity_id UUID;
BEGIN
    -- 1. Fetch Lead data
    SELECT name, tenant_id, project_id, assigned_to 
    INTO v_lead_name, v_tenant_id, v_project_id, v_assigned_to
    FROM public.leads 
    WHERE id = p_lead_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead no encontrado';
    END IF;

    -- 2. Create Account
    INSERT INTO public.accounts (tenant_id, name)
    VALUES (v_tenant_id, p_account_name)
    RETURNING id INTO v_account_id;

    -- 3. Create Contact
    INSERT INTO public.contacts (tenant_id, account_id, first_name, last_name, lead_source)
    VALUES (v_tenant_id, v_account_id, p_contact_first_name, p_contact_last_name, 'Convertido desde Lead')
    RETURNING id INTO v_contact_id;

    -- 4. Create Opportunity
    -- Assigning to 'NEGOCIACION' which matches the frontend
    INSERT INTO public.opportunities (tenant_id, account_id, contact_id, project_id, assigned_to, name, amount, stage, probability)
    VALUES (v_tenant_id, v_account_id, v_contact_id, v_project_id, v_assigned_to, p_opportunity_name, p_amount, 'NEGOCIACION', 20)
    RETURNING id INTO v_opportunity_id;

    -- 5. Update Lead
    UPDATE public.leads
    SET 
        is_converted = true,
        converted_account_id = v_account_id,
        converted_contact_id = v_contact_id,
        converted_opportunity_id = v_opportunity_id,
        status = 'CONVERTIDO',
        updated_at = NOW()
    WHERE id = p_lead_id;

    -- Return the newly created IDs
    RETURN jsonb_build_object(
      'account_id', v_account_id,
      'contact_id', v_contact_id,
      'opportunity_id', v_opportunity_id
    );
END;
$$;
