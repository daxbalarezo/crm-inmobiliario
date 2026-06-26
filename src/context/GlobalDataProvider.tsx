import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { useCRM } from './CRMContext';
import type { Lead } from '../types/definitions';

interface GlobalDataContextType {
  leads: Lead[];
  loading: boolean;
  error: string | null;
}

const GlobalDataContext = createContext<GlobalDataContextType | null>(null);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { tenantId, userProfile } = useCRM();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !userProfile) {
      setLeads([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchInitialData = async () => {
      try {
        // En una base SQL real con millones de registros, aquí pondríamos:
        // .gte('updated_at', 'hace_30_dias') para los cerrados, o cargar todo si es pequeño.
        // Para este MVP vamos a cargar todo el tenant en memoria (Caché global).
        const { data, error: fetchError } = await supabase
          .from('leads')
          .select('*')
          .eq('tenant_id', tenantId);

        if (fetchError) throw fetchError;
        
        // Transformar de snake_case (SQL) a camelCase (Frontend)
        const mappedLeads: Lead[] = (data || []).map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
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
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          savedProforma: row.saved_proforma,
          lossReason: row.loss_reason,
          customData: row.custom_data
        }));

        setLeads(mappedLeads);
      } catch (err: any) {
        console.error("Error fetching global leads:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

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
              lossReason: row.loss_reason, customData: row.custom_data
            };
            setLeads(prev => [...prev, newLead]);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            setLeads(prev => prev.map(l => l.id === row.id ? {
              ...l,
              projectId: row.project_id, assignedTo: row.assigned_to, name: row.name, phone: row.phone, email: row.email,
              dni: row.dni, source: row.source, status: row.status, interestLevel: row.interest_level, interactions: row.interactions,
              nextFollowUpDate: row.next_follow_up_date, nextFollowUpNote: row.next_follow_up_note, lastCampaignDate: row.last_campaign_date,
              contactDate: row.contact_date, firstContactAt: row.first_contact_at, createdAt: row.created_at, updatedAt: row.updated_at,
              savedProforma: row.saved_proforma, lossReason: row.loss_reason, customData: row.custom_data
            } : l));
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [tenantId, userProfile]);

  return (
    <GlobalDataContext.Provider value={{ leads, loading, error }}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) throw new Error('useGlobalData debe usarse dentro de <GlobalDataProvider>');
  return ctx;
}
