import { supabase } from '../config/supabase';
import type { LeadActivity } from '../types/definitions';

export const logActivityService = async (
  tenantId: string,
  leadId: string, 
  userId: string, 
  userName: string, 
  actionType: LeadActivity['actionType'], 
  description: string, 
  metadata?: any,
  dueDate?: string,
  status: 'open' | 'completed' = 'completed'
) => {
  if (!tenantId) return;
  try {
    const { error } = await supabase.from('lead_activities').insert({
      tenant_id: tenantId,
      lead_id: leadId,
      user_id: userId,
      user_name: userName,
      action_type: actionType,
      description,
      metadata: metadata || null,
      due_date: dueDate || null,
      status: status
    });
    
    if (error) throw error;
  } catch (e) {
    console.error("Error logging activity:", e);
    throw e;
  }
};

export const updateLeadActivityStatus = async (activityId: string, status: 'completed'): Promise<void> => {
  const { error } = await supabase
    .from('lead_activities')
    .update({ status })
    .eq('id', activityId);
    
  if (error) throw error;
};

export const getLeadActivitiesService = async (tenantId: string, leadId: string): Promise<LeadActivity[]> => {
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      leadId: row.lead_id,
      userId: row.user_id,
      userName: row.user_name,
      actionType: row.action_type,
      description: row.description,
      metadata: row.metadata,
      dueDate: row.due_date,
      status: row.status,
      createdAt: row.created_at
    } as LeadActivity));
  } catch (e) {
    console.error("Error fetching lead activities:", e);
    return [];
  }
};
