-- 21_salesforce_model.sql

-- 1. Create Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    industry VARCHAR,
    website VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Opportunities Table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(uid) ON DELETE SET NULL,
    name VARCHAR NOT NULL,
    amount NUMERIC DEFAULT 0,
    stage VARCHAR NOT NULL DEFAULT 'NEGOCIACIÓN',
    probability INTEGER DEFAULT 10,
    close_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alter Leads Table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS converted_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- 5. RLS and Policies for Accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read all accounts" ON public.accounts FOR SELECT USING ((SELECT role FROM public.users WHERE uid = auth.uid()) = 'owner');
CREATE POLICY "Tenant users can view their own accounts" ON public.accounts FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can insert accounts" ON public.accounts FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can update their accounts" ON public.accounts FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can delete their accounts" ON public.accounts FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- 6. RLS and Policies for Contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read all contacts" ON public.contacts FOR SELECT USING ((SELECT role FROM public.users WHERE uid = auth.uid()) = 'owner');
CREATE POLICY "Tenant users can view their own contacts" ON public.contacts FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can insert contacts" ON public.contacts FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can update their contacts" ON public.contacts FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can delete their contacts" ON public.contacts FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- 7. RLS and Policies for Opportunities
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read all opportunities" ON public.opportunities FOR SELECT USING ((SELECT role FROM public.users WHERE uid = auth.uid()) = 'owner');
CREATE POLICY "Tenant users can view their own opportunities" ON public.opportunities FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can insert opportunities" ON public.opportunities FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can update their opportunities" ON public.opportunities FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant users can delete their opportunities" ON public.opportunities FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- 8. Enable Realtime
-- Need to check if publications exist before creating, but supabase has 'supabase_realtime' publication
DO $$
BEGIN
    -- Add accounts to supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'accounts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
    END IF;

    -- Add contacts to supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contacts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
    END IF;

    -- Add opportunities to supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'opportunities'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
    END IF;
END $$;

-- 9. RPC Function for Conversion (Safe transactional conversion)
CREATE OR REPLACE FUNCTION public.convert_lead(
    p_lead_id UUID,
    p_account_name VARCHAR,
    p_contact_first_name VARCHAR,
    p_contact_last_name VARCHAR,
    p_opportunity_name VARCHAR,
    p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_project_id UUID;
    v_assigned_to UUID;
    v_email VARCHAR;
    v_phone VARCHAR;
    v_is_converted BOOLEAN;
    
    v_account_id UUID;
    v_contact_id UUID;
    v_opportunity_id UUID;
BEGIN
    -- 1. Fetch Lead
    SELECT tenant_id, project_id, assigned_to, email, phone, is_converted
    INTO v_tenant_id, v_project_id, v_assigned_to, v_email, v_phone, v_is_converted
    FROM public.leads
    WHERE id = p_lead_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    IF v_is_converted THEN
        RAISE EXCEPTION 'Lead is already converted';
    END IF;

    -- Ensure permissions (User must belong to the tenant or be an owner)
    IF v_tenant_id != public.get_auth_tenant_id() AND (SELECT role FROM public.users WHERE uid = auth.uid()) != 'owner' THEN
        RAISE EXCEPTION 'Unauthorized to convert this lead';
    END IF;

    -- 2. Create Account
    INSERT INTO public.accounts (tenant_id, name)
    VALUES (v_tenant_id, p_account_name)
    RETURNING id INTO v_account_id;

    -- 3. Create Contact
    INSERT INTO public.contacts (tenant_id, account_id, first_name, last_name, email, phone)
    VALUES (v_tenant_id, v_account_id, p_contact_first_name, p_contact_last_name, v_email, v_phone)
    RETURNING id INTO v_contact_id;

    -- 4. Create Opportunity
    -- By default we assign it to the same user and project as the lead
    INSERT INTO public.opportunities (tenant_id, account_id, contact_id, project_id, assigned_to, name, amount, stage, probability)
    VALUES (v_tenant_id, v_account_id, v_contact_id, v_project_id, v_assigned_to, p_opportunity_name, p_amount, 'EN_NEGOCIACION', 50)
    RETURNING id INTO v_opportunity_id;

    -- 5. Update Lead
    UPDATE public.leads
    SET is_converted = TRUE,
        converted_account_id = v_account_id,
        converted_contact_id = v_contact_id,
        converted_opportunity_id = v_opportunity_id,
        converted_at = NOW()
    WHERE id = p_lead_id;

    -- Return the generated IDs
    RETURN jsonb_build_object(
        'account_id', v_account_id,
        'contact_id', v_contact_id,
        'opportunity_id', v_opportunity_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
