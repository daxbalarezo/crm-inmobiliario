import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import { useGlobalData } from '../context/GlobalDataProvider';
import type { Lead, UserProfile, LeadActivity } from '../types/definitions';

export interface AgentGlobalStats {
  totalAssigned: number;
  totalClosed: number;
  totalReservations: number;
  avgConv: number;
  projectedRevenue: number;
  totalActivities: number;
}

export interface FunnelData {
  name: string;
  value: number;
}

export function useAgentAnalytics(agentId: string, timeRange: string, stageFilter: string) {
  const { tenantId, userProfile } = useCRM();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentGlobalStats>({
    totalAssigned: 0,
    totalClosed: 0,
    totalReservations: 0,
    avgConv: 0,
    projectedRevenue: 0,
    totalActivities: 0
  });
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [agentsList, setAgentsList] = useState<UserProfile[]>([]);

  // Raw data
  const { leads: globalLeads, loading: globalLoading } = useGlobalData();
  const [allAgentLeads, setAllAgentLeads] = useState<Lead[]>([]);
  const [allAgentActivities, setAllAgentActivities] = useState<LeadActivity[]>([]);

  useEffect(() => {
    if (!tenantId || !userProfile) return;
    loadAgents();
  }, [tenantId, userProfile]);

  useEffect(() => {
    if (!tenantId || !agentId) return;
    loadAgentData();
  }, [tenantId, agentId]);

  useEffect(() => {
    if (!loading && !globalLoading) {
      computeStats();
    }
  }, [timeRange, stageFilter, allAgentLeads, allAgentActivities, loading, globalLoading]);

  const loadAgents = async () => {
    try {
      let query = supabase.from('users').select('*');
      if (userProfile?.role !== 'owner') {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;

      const fetchedUsers = (data || []).map(row => ({
        uid: row.uid,
        tenantId: row.tenant_id,
        role: row.role,
        name: String(row.name || '').toUpperCase(),
        email: row.email,
        assignedProjectIds: row.assigned_project_ids || []
      }) as UserProfile).filter(u => u.role !== 'owner' && u.role !== 'manager');
      
      setAgentsList(fetchedUsers);
    } catch (e) {
      console.error("Error loading agents", e);
    }
  };

  const loadAgentData = async () => {
    setLoading(true);
    try {
      // Filtrar leads globales en RAM
      const fetchedLeads = globalLeads.filter(l => l.tenantId === tenantId && l.assignedTo === agentId);
      
      // Consultar actividades en Supabase
      const { data: actsData, error: actsError } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', agentId);

      if (actsError) throw actsError;

      const fetchedActivities = (actsData || []).map(row => ({
        id: row.id,
        leadId: row.lead_id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        type: row.type,
        notes: row.notes,
        createdAt: row.created_at
      } as LeadActivity));

      setAllAgentLeads(fetchedLeads);
      setAllAgentActivities(fetchedActivities);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const computeStats = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let rangedLeads = allAgentLeads;
    let rangedActivities = allAgentActivities;

    if (timeRange !== 'all') {
      rangedLeads = allAgentLeads.filter(l => {
        if (!l.createdAt) return false;
        const leadDate = new Date(l.createdAt);
        if (isNaN(leadDate.getTime())) return false;

        if (timeRange === 'this_month') {
          return leadDate.getFullYear() === currentYear && leadDate.getMonth() === currentMonth;
        } else if (timeRange === 'last_month') {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const year = currentMonth === 0 ? currentYear - 1 : currentYear;
          return leadDate.getFullYear() === year && leadDate.getMonth() === lastMonth;
        } else if (timeRange === 'last_6_months') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return leadDate >= sixMonthsAgo;
        } else if (timeRange === 'this_year') {
          return leadDate.getFullYear() === currentYear;
        }
        return true;
      });

      rangedActivities = allAgentActivities.filter(a => {
        if (!a.createdAt) return false;
        const actDate = new Date(a.createdAt);
        if (isNaN(actDate.getTime())) return false;

        if (timeRange === 'this_month') {
          return actDate.getFullYear() === currentYear && actDate.getMonth() === currentMonth;
        } else if (timeRange === 'last_month') {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const year = currentMonth === 0 ? currentYear - 1 : currentYear;
          return actDate.getFullYear() === year && actDate.getMonth() === lastMonth;
        } else if (timeRange === 'last_6_months') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return actDate >= sixMonthsAgo;
        } else if (timeRange === 'this_year') {
          return actDate.getFullYear() === currentYear;
        }
        return true;
      });
    }

    let totalClosed = 0;
    let totalReservations = 0;
    let projectedRevenue = 0;

    const stageCounts = {
      'NUEVO': 0,
      'CONTACTADO': 0,
      'EN_NEGOCIACION': 0,
      'VISITA': 0,
      'SEPARACION': 0,
      'VENDIDO': 0,
      'DESCARTADO': 0
    };

    rangedLeads.forEach(l => {
      const statusStr = (l.status || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Projected Revenue
      if (statusStr === 'EN_NEGOCIACION' || statusStr === 'EN NEGOCIACION' || statusStr === 'NEGOCIACION' || statusStr === 'NEGOCIACIONES' || statusStr === 'SEPARACION' || statusStr === 'SEPARACIONES') {
        const val = l.savedProforma?.finalPrice || Number(l.customData?.presupuesto) || 0;
        projectedRevenue += val;
      }

      if (statusStr === 'VENDIDO' || statusStr === 'CERRADO') {
        totalClosed++;
        stageCounts['VENDIDO']++;
      } else if (statusStr === 'SEPARACION' || statusStr === 'SEPARACIONES') {
        totalReservations++;
        stageCounts['SEPARACION']++;
      } else if (statusStr === 'VISITA' || statusStr === 'VISITAS') {
        stageCounts['VISITA']++;
      } else if (statusStr === 'EN_NEGOCIACION' || statusStr === 'EN NEGOCIACION' || statusStr === 'NEGOCIACION' || statusStr === 'NEGOCIACIONES') {
        stageCounts['EN_NEGOCIACION']++;
      } else if (statusStr === 'CONTACTADO' || statusStr === 'CONTACTAR') {
        stageCounts['CONTACTADO']++;
      } else if (statusStr === 'PROSPECTO' || statusStr === 'NUEVO' || statusStr === 'SIN_CONTACTAR' || statusStr === 'SIN CONTACTAR') {
        stageCounts['NUEVO']++;
      } else if (statusStr === 'DESCARTADO') {
        stageCounts['DESCARTADO']++;
      }
    });

    setStats({
      totalAssigned: rangedLeads.length,
      totalClosed,
      totalReservations,
      avgConv: rangedLeads.length > 0 ? (totalClosed / rangedLeads.length) * 100 : 0,
      projectedRevenue,
      totalActivities: rangedActivities.length
    });

    setFunnelData([
      { name: 'Nuevos', value: stageCounts['NUEVO'] },
      { name: 'Contactados', value: stageCounts['CONTACTADO'] },
      { name: 'En Negociación', value: stageCounts['EN_NEGOCIACION'] },
      { name: 'Visitas', value: stageCounts['VISITA'] },
      { name: 'Separaciones', value: stageCounts['SEPARACION'] },
      { name: 'Vendidos', value: stageCounts['VENDIDO'] },
      { name: 'Descartados', value: stageCounts['DESCARTADO'] }
    ]);

    // Tabla de leads
    if (stageFilter === 'all') {
      setFilteredLeads(rangedLeads);
    } else {
      setFilteredLeads(rangedLeads.filter(l => {
        const s1 = (stageFilter || '').replace(/_/g, ' ').toUpperCase();
        const s2 = (l.status || '').replace(/_/g, ' ').toUpperCase();
        
        if ((s1 === 'PROSPECTO' || s1 === 'NUEVO') && (s2 === 'NUEVO' || s2 === 'PROSPECTO')) return true;
        if ((s1 === 'SIN CONTACTAR' || s1 === 'CONTACTADO') && (s2 === 'SIN CONTACTAR' || s2 === 'CONTACTADO')) return true;
        
        return s1 === s2;
      }));
    }
  };

  return { loading, stats, funnelData, filteredLeads, agentsList };
}
