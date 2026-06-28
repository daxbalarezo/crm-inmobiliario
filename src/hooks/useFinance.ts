import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import type { Payment } from '../types/definitions';
import { useAuditTrail } from './useAuditTrail';
import { useCRM } from '../context/CRMContext';

export function useFinance(tenantId?: string) {
  const { userProfile } = useCRM();
  const { logEvent } = useAuditTrail(tenantId || '');
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga automática de pagos pendientes para un tenant (vista del contador)
  useEffect(() => {
    if (!tenantId) {
      setAllPayments([]);
      setLoading(false);
      return;
    }

    const fetchPayments = async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const mapped = (data || []).map(row => ({
          id: row.id,
          leadId: row.lead_id,
          tenantId: row.tenant_id,
          amount: row.amount,
          method: row.method,
          reference: row.reference,
          status: row.status,
          type: row.type,
          concept: row.concept,
          notes: row.notes,
          attachmentUrl: row.attachment_url,
          approvedBy: row.approved_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        } as Payment));
        
        setAllPayments(mapped);
      } catch (err) {
        console.error("Error fetching pending payments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    const channel = supabase.channel('payments_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `tenant_id=eq.${tenantId}` }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Obtener pagos de un prospecto específico
  const getLeadPayments = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        leadId: row.lead_id,
        tenantId: row.tenant_id,
        amount: row.amount,
        method: row.method,
        reference: row.reference,
        status: row.status,
        type: row.type,
        concept: row.concept,
        notes: row.notes,
        attachmentUrl: row.attachment_url,
        approvedBy: row.approved_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as Payment));
    } catch (e) {
      console.error("Error fetching lead payments:", e);
      return [];
    }
  };

  // Registrar un nuevo pago (Asesor)
  const createPayment = async (data: Omit<Payment, 'id' | 'createdAt' | 'status'>) => {
    try {
      const row = {
        lead_id: data.leadId,
        tenant_id: data.tenantId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        status: 'PENDING',
        type: data.type,
        concept: data.concept,
        notes: data.notes,
        attachment_url: data.attachmentUrl
      };
      
      const { data: inserted, error } = await supabase
        .from('payments')
        .insert(row)
        .select()
        .single();
        
      if (error) throw error;
      
      return {
        id: inserted.id,
        ...data,
        status: 'PENDING',
        createdAt: inserted.created_at
      } as unknown as unknown as Payment;
    } catch (e) {
      console.error("Error creating payment:", e);
      throw e;
    }
  };

  // Aprobar pago (Contador/Admin)
  const approvePayment = async (paymentId: string, approvedBy: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'APPROVED', approved_by: approvedBy })
        .eq('id', paymentId);
        
      if (error) throw error;
      
      if (userProfile) {
        await logEvent(userProfile.uid, userProfile.name, 'APPROVE', 'PAYMENT', paymentId, `Pago aprobado`);
      }
    } catch (e) {
      console.error("Error approving payment:", e);
      throw e;
    }
  };

  // Rechazar pago (Contador/Admin)
  const rejectPayment = async (paymentId: string, approvedBy: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'REJECTED', 
          approved_by: approvedBy,
          notes: notes || 'Rechazado por el administrador'
        })
        .eq('id', paymentId);
        
      if (error) throw error;
      
      if (userProfile) {
        await logEvent(userProfile.uid, userProfile.name, 'REJECT', 'PAYMENT', paymentId, `Pago rechazado. Motivo: ${notes || 'Rechazado por el administrador'}`);
      }
    } catch (e) {
      console.error("Error rejecting payment:", e);
      throw e;
    }
  };

  // Obtener plantilla por defecto
  const getContractTemplate = async () => {
    if (!tenantId) return null;
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const mapped = data.map(d => ({
        id: d.id,
        tenantId: d.tenant_id,
        name: d.name,
        docxBase64: d.docx_base64,
        size: d.size,
        isDefault: d.is_default,
        createdAt: d.created_at
      }));
      
      return mapped.find(t => t.isDefault) || mapped[0];
    } catch (e) {
      console.error("Error fetching template:", e);
      return null;
    }
  };

  // Obtener todas las plantillas
  const getContractTemplates = async () => {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      
      const mapped = (data || []).map(d => ({
        id: d.id,
        tenantId: d.tenant_id,
        name: d.name,
        docxBase64: d.docx_base64,
        size: d.size,
        isDefault: d.is_default,
        createdAt: d.created_at
      }));
      
      return mapped.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    } catch (e) {
      console.error("Error fetching templates:", e);
      return [];
    }
  };

  // Subir nueva plantilla
  const uploadContractTemplate = async (name: string, docxBase64: string, size: number) => {
    if (!tenantId) return;
    try {
      const existing = await getContractTemplates();
      if (existing.length >= 5) {
        throw new Error("Límite alcanzado: Máximo 5 plantillas.");
      }
      const isDefault = existing.length === 0;
      
      const { error } = await supabase
        .from('contract_templates')
        .insert({
          tenant_id: tenantId,
          name,
          docx_base64: docxBase64,
          size,
          is_default: isDefault
        });
        
      if (error) throw error;
    } catch (e) {
      console.error("Error uploading template:", e);
      throw e;
    }
  };

  // Guardar/Actualizar plantilla antigua
  const saveContractTemplate = async (docxBase64: string) => {
    if (!tenantId) return;
    try {
      // Upsert
      const { error } = await supabase
        .from('contract_templates')
        .upsert({
          id: tenantId, // using tenantId as ID for retrocompatibility if possible, though UUID might conflict
          tenant_id: tenantId,
          name: 'Plantilla Principal',
          docx_base64: docxBase64,
          is_default: true
        });
      if (error) throw error;
    } catch (e) {
      console.error("Error saving template:", e);
      throw e;
    }
  };

  // Eliminar plantilla
  const deleteContractTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from('contract_templates').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Error deleting template:", e);
      throw e;
    }
  };

  // Renombrar plantilla
  const renameContractTemplate = async (id: string, newName: string) => {
    try {
      const { error } = await supabase.from('contract_templates').update({ name: newName }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Error renaming template:", e);
      throw e;
    }
  };

  // Marcar como predeterminada
  const setDefaultContractTemplate = async (id: string) => {
    if (!tenantId) return;
    try {
      // Unset all
      await supabase.from('contract_templates').update({ is_default: false }).eq('tenant_id', tenantId);
      // Set one
      await supabase.from('contract_templates').update({ is_default: true }).eq('id', id);
    } catch (e) {
      console.error("Error setting default template:", e);
      throw e;
    }
  };

  return {
    allPayments,
    loading,
    getLeadPayments,
    createPayment,
    approvePayment,
    rejectPayment,
    getContractTemplate,
    getContractTemplates,
    saveContractTemplate,
    uploadContractTemplate,
    deleteContractTemplate,
    renameContractTemplate,
    setDefaultContractTemplate
  };
}
