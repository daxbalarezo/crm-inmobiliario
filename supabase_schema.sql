-- Supabase Schema for CRM Inmobiliario

-- 1. Tenants Table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT DEFAULT 'active',
    stages JSONB DEFAULT '[]'::jsonb,
    sources JSONB DEFAULT '[]'::jsonb,
    fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE public.users (
    uid UUID PRIMARY KEY REFERENCES auth.users(id),
    tenant_id UUID REFERENCES public.tenants(id),
    role TEXT NOT NULL DEFAULT 'agent',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    assigned_project_ids TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active',
    out_of_office BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Projects Table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Leads Table
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id),
    project_id UUID REFERENCES public.projects(id),
    assigned_to UUID REFERENCES public.users(uid),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    dni TEXT,
    source TEXT,
    status TEXT NOT NULL,
    interest_level TEXT,
    interactions JSONB DEFAULT '[]'::jsonb,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_note TEXT,
    last_campaign_date TIMESTAMP WITH TIME ZONE,
    contact_date TIMESTAMP WITH TIME ZONE,
    first_contact_at TIMESTAMP WITH TIME ZONE,
    saved_proforma JSONB,
    loss_reason TEXT,
    custom_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Activities (Lead Activity)
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id),
    lead_id UUID REFERENCES public.leads(id),
    user_id UUID REFERENCES public.users(uid),
    user_name TEXT,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Units Table
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id),
    project_id UUID REFERENCES public.projects(id),
    custom_id TEXT NOT NULL,
    "group" TEXT NOT NULL,
    type TEXT NOT NULL,
    area NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    price_2k NUMERIC,
    price_5k NUMERIC,
    price_cash NUMERIC,
    status TEXT NOT NULL,
    description TEXT
);

-- 7. Payments Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id),
    lead_id UUID REFERENCES public.leads(id),
    lead_name TEXT NOT NULL,
    unit_id UUID REFERENCES public.units(id),
    unit_name TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    reference TEXT NOT NULL,
    voucher_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_by UUID REFERENCES public.users(uid),
    approved_by UUID REFERENCES public.users(uid),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Draft for migration testing)
-- In production, policies should verify auth.uid() and tenant_id
CREATE POLICY "Allow public read for testing" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Allow public read for testing" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public read for testing" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public read for testing" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow public read for testing" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Allow public read for testing" ON public.units FOR SELECT USING (true);
CREATE POLICY "Allow public read for testing" ON public.payments FOR SELECT USING (true);

-- Functions and Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
