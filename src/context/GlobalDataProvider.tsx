import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCRM } from './CRMContext';
import type { Lead } from '../types/definitions';

interface GlobalDataContextType {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  updateLeadOptimistically: (id: string, patch: Partial<Lead>) => void;
  addLeadOptimistically: (lead: Lead) => void;
}

const GlobalDataContext = createContext<GlobalDataContextType | null>(null);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { tenantId, userProfile } = useCRM();
  const queryClient = useQueryClient();
  const queryKey = ['global_leads', tenantId];

  const { data: leads = [], isLoading: loading, error: queryError } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId);

      if (fetchError) throw fetchError;
      
      const mappedLeads: Lead[] = (data || []).map(row => ({
        id: row.id, tenantId: row.tenant_id, projectId: row.project_id, assignedTo: row.assigned_to,
        name: row.name, phone: row.phone, email: row.email, dni: row.dni, source: row.source, status: row.status,
        interestLevel: row.interest_level, interactions: row.interactions, nextFollowUpDate: row.next_follow_up_date,
        nextFollowUpNote: row.next_follow_up_note, lastCampaignDate: row.last_campaign_date, contactDate: row.contact_date,
        firstContactAt: row.first_contact_at, createdAt: row.created_at, updatedAt: row.updated_at, savedProforma: row.saved_proforma,
        lossReason: row.loss_reason, lossNotes: row.loss_notes, customData: row.custom_data,
        isConverted: row.is_converted, convertedAccountId: row.converted_account_id,
        convertedContactId: row.converted_contact_id, convertedOpportunityId: row.converted_opportunity_id,
        convertedAt: row.converted_at
      }));
      return mappedLeads;
    },
    enabled: !!tenantId && !!userProfile,
  });

  const error = queryError ? queryError.message : null;

  useEffect(() => {
    if (!tenantId || !userProfile) return;

    // Supabase Realtime Subscription (El único caño vivo)
    const channel = supabase.channel('global_leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            const newLead: Lead = {
              id: row.id, tenantId: row.tenant_id, projectId: row.project_id, assignedTo: row.assigned_to,
              name: row.name, phone: row.phone, email: row.email, dni: row.dni, source: row.source, status: row.status,
              interestLevel: row.interest_level, interactions: row.interactions, nextFollowUpDate: row.next_follow_up_date,
              nextFollowUpNote: row.next_follow_up_note, lastCampaignDate: row.last_campaign_date, contactDate: row.contact_date,
              firstContactAt: row.first_contact_at, createdAt: row.created_at, updatedAt: row.updated_at, savedProforma: row.saved_proforma,
              lossReason: row.loss_reason, lossNotes: row.loss_notes, customData: row.custom_data,
              isConverted: row.is_converted, convertedAccountId: row.converted_account_id,
              convertedContactId: row.converted_contact_id, convertedOpportunityId: row.converted_opportunity_id,
              convertedAt: row.converted_at
            };
            queryClient.setQueryData(queryKey, (old: Lead[] = []) => [...old, newLead]);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            queryClient.setQueryData(queryKey, (old: Lead[] = []) => old.map(l => l.id === row.id ? {
              ...l,
              projectId: row.project_id,
              assignedTo: row.assigned_to,
              name: row.name,
              phone: row.phone,
              email: row.email,
              dni: row.dni,
              source: row.source,
              status: row.status,
              interestLevel: row.interest_level,
              interactions: row.interactions,
              nextFollowUpDate: row.next_follow_up_date,
              nextFollowUpNote: row.next_follow_up_note,
              lastCampaignDate: row.last_campaign_date,
              contactDate: row.contact_date,
              firstContactAt: row.first_contact_at,
              updatedAt: row.updated_at,
              savedProforma: row.saved_proforma,
              lossReason: row.loss_reason,
              lossNotes: row.loss_notes,
              customData: row.custom_data,
              isConverted: row.is_converted,
              convertedAccountId: row.converted_account_id,
              convertedContactId: row.converted_contact_id,
              convertedOpportunityId: row.converted_opportunity_id,
              convertedAt: row.converted_at
            } : l));
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(queryKey, (old: Lead[] = []) => old.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [tenantId, userProfile]);

  const updateLeadOptimistically = (id: string, patch: Partial<Lead>) => {
    queryClient.setQueryData(queryKey, (old: Lead[] = []) => old.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const addLeadOptimistically = (lead: Lead) => {
    queryClient.setQueryData(queryKey, (old: Lead[] = []) => [lead, ...old]);
  };

  return (
    <GlobalDataContext.Provider value={{ leads, loading, error, updateLeadOptimistically, addLeadOptimistically }}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) throw new Error('useGlobalData debe usarse dentro de <GlobalDataProvider>');
  return ctx;
}
