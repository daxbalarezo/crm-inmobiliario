import { supabase } from '../config/supabase';
import type { Lead } from '../types/definitions'; 

const TABLE_NAME = 'leads'; 

const cleanPayload = (data: Partial<Lead>) => {
  const payload: any = { ...data };
  if (payload.area) payload.area = Number(payload.area);
  if (payload.price) payload.price = Number(payload.price);
  return payload;
};

export const saveLeadService = async (
  formData: any, 
  editingId: string | null,
  tenantId: string, 
  projectId: string,
  ownerId: string
) => {
  try {
    const cleanData = cleanPayload(formData);
    
    const row = { 
      tenant_id: tenantId, 
      project_id: projectId,
      assigned_to: ownerId || cleanData.assignedTo,
      name: cleanData.name,
      phone: cleanData.phone,
      email: cleanData.email,
      dni: cleanData.dni,
      source: cleanData.source,
      status: cleanData.status,
      interest_level: cleanData.interestLevel,
      interactions: cleanData.interactions,
      next_follow_up_date: cleanData.nextFollowUpDate,
      next_follow_up_note: cleanData.nextFollowUpNote,
      last_campaign_date: cleanData.lastCampaignDate,
      contact_date: cleanData.contactDate,
      first_contact_at: cleanData.firstContactAt,
      saved_proforma: cleanData.savedProforma,
      loss_reason: cleanData.lossReason,
      loss_notes: cleanData.lossNotes,
      custom_data: cleanData.customData
    };

    // Remove undefined values
    Object.keys(row).forEach(key => {
      if ((row as any)[key] === undefined) {
        delete (row as any)[key];
      }
    });

    if (editingId) {
      const { error } = await supabase.from(TABLE_NAME).update(row).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(TABLE_NAME).insert(row);
      if (error) throw error;
    }
    return { success: true };
  } catch (error) {
    console.error("🚨 Error crítico en persistencia multi-tenant:", error);
    throw error;
  }
};

export const deleteLeadService = async (id: string) => {
  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("🚨 Error al eliminar lead:", error);
    throw error;
  }
};

export const completeTaskService = async (lead: Lead, tenantId: string) => {
  try {
    const note = { 
      id: Date.now().toString(), 
      date: new Date().toISOString(), 
      type: 'Sistema', 
      note: `✅ Completado: ${lead.nextFollowUpNote || ''}`,
      tenantId 
    };
    
    const updatedInteractions = [note, ...(lead.interactions || [])];
    
    const { error } = await supabase.from(TABLE_NAME).update({ 
        interactions: updatedInteractions, 
        next_follow_up_date: null, 
        next_follow_up_note: null    
    }).eq('id', lead.id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("🚨 Error al completar tarea:", error);
    throw error;
  }
};