import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import type { Opportunity } from '../types/definitions';

export function useOpportunities() {
  const { tenantId, userProfile } = useCRM();
  const queryClient = useQueryClient();
  const queryKey = ['opportunities', tenantId];

  const { data: opportunities = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('tenant_id', tenantId);

      if (fetchError) throw fetchError;
      
      return (data || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        accountId: row.account_id,
        contactId: row.contact_id,
        projectId: row.project_id,
        assignedTo: row.assigned_to,
        name: row.name,
        amount: row.amount,
        stage: (row.stage === 'NEGOCIACIÓN' || row.stage === 'EN_NEGOCIACION') ? 'NEGOCIACION' : row.stage,
        probability: row.probability,
        closeDate: row.close_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })) as Opportunity[];
    },
    enabled: !!tenantId && !!userProfile,
  });

  useEffect(() => {
    if (!tenantId || !userProfile) return;

    const channel = supabase.channel('realtime_opportunities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            const newOpp: Opportunity = {
              id: row.id,
              tenantId: row.tenant_id,
              accountId: row.account_id,
              contactId: row.contact_id,
              projectId: row.project_id,
              assignedTo: row.assigned_to,
              name: row.name,
              amount: row.amount,
              stage: row.stage === 'NEGOCIACIÓN' ? 'EN_NEGOCIACION' : row.stage,
              probability: row.probability,
              closeDate: row.close_date,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
            queryClient.setQueryData(queryKey, (old: Opportunity[] = []) => [...old, newOpp]);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            queryClient.setQueryData(queryKey, (old: Opportunity[] = []) => old.map(o => o.id === row.id ? {
              ...o,
              accountId: row.account_id,
              contactId: row.contact_id,
              projectId: row.project_id,
              assignedTo: row.assigned_to,
              name: row.name,
              amount: row.amount,
              stage: row.stage === 'NEGOCIACIÓN' ? 'EN_NEGOCIACION' : row.stage,
              probability: row.probability,
              closeDate: row.close_date,
              updatedAt: row.updated_at
            } : o));
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(queryKey, (old: Opportunity[] = []) => old.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, userProfile, queryClient]);

  const updateOpportunityOptimistically = (id: string, patch: Partial<Opportunity>) => {
    queryClient.setQueryData(queryKey, (old: Opportunity[] = []) => old.map(o => o.id === id ? { ...o, ...patch } : o));
  };

  const addOpportunityOptimistically = (opp: Opportunity) => {
    queryClient.setQueryData(queryKey, (old: Opportunity[] = []) => [opp, ...old]);
  };

  return {
    opportunities,
    isLoading,
    error: error ? error.message : null,
    updateOpportunityOptimistically,
    addOpportunityOptimistically
  };
}
