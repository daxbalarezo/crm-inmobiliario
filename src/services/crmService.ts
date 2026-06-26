import { supabase } from '../config/supabase';

// ==========================================
// Tipos de Datos (CRM Layer)
// ==========================================
export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  status: 'active' | 'inactive' | 'sold_out';
  created_at: string;
  updated_at?: string;
  tenants?: { name: string };
}

export const crmService = {
  // --- Projects ---
  async getProjects(tenantId?: string): Promise<Project[]> {
    let query = supabase
      .from('projects')
      .select('*, tenants(name)')
      .order('created_at', { ascending: false });
      
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createProject(payload: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert([payload])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async updateProjectStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id);
      
    if (error) throw error;
  }
};
