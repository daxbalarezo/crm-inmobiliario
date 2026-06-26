import { supabase } from '../config/supabase';

// ==========================================
// Tipos de Datos (SaaS Layer)
// ==========================================
export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'pending';
  plan_id: string;
  billing_email: string;
  created_at: string;
}

export interface SaaSPlan {
  id: string;
  name: string;
  price_monthly: number;
  max_users: number;
  max_projects: number;
  features_json: any;
  is_active: boolean;
}

export interface SeedTemplate {
  id: string;
  type: 'pipeline_stage' | 'sla_rule';
  name: string;
  description: string;
  config_json: any;
  is_active: boolean;
}

export interface Broadcast {
  id: string;
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
  target_scope: string;
  created_at: string;
}

export interface SaaSSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'pending_verification';
  current_period_start: string;
  current_period_end: string;
  mrr: number;
  created_at: string;
  tenants?: { name: string };
  saas_plans?: { name: string };
}

// ==========================================
// Servicios SaaS
// ==========================================

export const saasService = {
  // --- Tenants ---
  async getTenants(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateTenantStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  // --- Plans ---
  async getPlans(): Promise<SaaSPlan[]> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // --- Subscriptions ---
  async getSubscriptions(): Promise<SaaSSubscription[]> {
    const { data, error } = await supabase
      .from('saas_subscriptions')
      .select('*, tenants(name), saas_plans(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateSubscriptionStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('saas_subscriptions')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  // --- Seed Templates ---
  async getSeedTemplates(type?: string): Promise<SeedTemplate[]> {
    let query = supabase.from('saas_seed_templates').select('*');
    if (type) {
      query = query.eq('type', type);
    }
    // Para pipeline_stage, ordenamos por la key order dentro de config_json
    // Como Supabase puede ordenar por JSON, lo intentaremos, pero es mejor ordenar en memoria por ahora.
    const { data, error } = await query;
    if (error) throw error;
    
    // Sort logic in memory just in case
    return (data || []).sort((a, b) => {
      const orderA = a.config_json?.order || 0;
      const orderB = b.config_json?.order || 0;
      return orderA - orderB;
    });
  },

  // --- Broadcasts ---
  async getBroadcasts(): Promise<Broadcast[]> {
    const { data, error } = await supabase
      .from('saas_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createBroadcast(payload: Partial<Broadcast>): Promise<void> {
    const { error } = await supabase
      .from('saas_broadcasts')
      .insert([payload]);
    if (error) throw error;
  },

  // --- Audit Logs ---
  async getAuditLogs(): Promise<any[]> {
    const { data, error } = await supabase
      .from('saas_audit_logs')
      .select('*, tenants(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
