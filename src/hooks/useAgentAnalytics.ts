import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
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
    if (!loading) {
      computeStats();
    }
  }, [timeRange, stageFilter, allAgentLeads, allAgentActivities, loading]);

  const loadAgents = async () => {
    try {
      let usersSnap;
      if (userProfile?.role === 'owner') {
        usersSnap = await getDocs(collection(db, 'users'));
      } else {
        usersSnap = await getDocs(query(collection(db, 'users'), where('tenantId', '==', tenantId)));
      }
      const fetchedUsers = usersSnap.docs.map(d => {
        const data = d.data() as UserProfile;
        return { ...data, uid: d.id, name: String(data.name || '').toUpperCase() };
      }).filter(u => u.role === 'agent');
      setAgentsList(fetchedUsers);
    } catch (e) {
      console.error("Error loading agents", e);
    }
  };

  const loadAgentData = async () => {
    setLoading(true);
    try {
      const leadsSnap = await getDocs(query(collection(db, 'leads'), where('tenantId', '==', tenantId), where('assignedTo', '==', agentId)));
      const fetchedLeads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      
      const actsSnap = await getDocs(query(collection(db, 'lead_activities'), where('tenantId', '==', tenantId), where('userId', '==', agentId)));
      const fetchedActivities = actsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LeadActivity));

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
        const leadDate = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
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
        const actDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
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
      'PROSPECTO': 0,
      'SIN_CONTACTAR': 0,
      'EN_NEGOCIACION': 0,
      'VISITA': 0,
      'SEPARACION': 0,
      'VENDIDO': 0,
      'PERDIDO': 0
    };

    rangedLeads.forEach(l => {
      // Projected Revenue
      if (l.status === 'EN NEGOCIACION' || l.status === 'SEPARACION') {
        const val = l.savedProforma?.finalPrice || Number(l.customData?.presupuesto) || 0;
        projectedRevenue += val;
      }

      if (l.status === 'VENDIDO' || l.status === 'CERRADO') {
        totalClosed++;
        stageCounts['VENDIDO']++;
      } else if (l.status === 'SEPARACION') {
        totalReservations++;
        stageCounts['SEPARACION']++;
      } else if (l.status === 'VISITA') {
        stageCounts['VISITA']++;
      } else if (l.status === 'EN_NEGOCIACION' || l.status === 'EN NEGOCIACION') {
        stageCounts['EN_NEGOCIACION']++;
      } else if (l.status === 'SIN_CONTACTAR' || l.status === 'SIN CONTACTAR' || l.status === 'CONTACTADO') {
        stageCounts['SIN_CONTACTAR']++;
      } else if (l.status === 'PROSPECTO' || l.status === 'NUEVO') {
        stageCounts['PROSPECTO']++;
      } else if (l.status === 'PERDIDO') {
        stageCounts['PERDIDO']++;
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
      { name: 'Prospectos', value: stageCounts['PROSPECTO'] },
      { name: 'Sin Contactar', value: stageCounts['SIN_CONTACTAR'] },
      { name: 'En Negociación', value: stageCounts['EN_NEGOCIACION'] },
      { name: 'Visitas', value: stageCounts['VISITA'] },
      { name: 'Separaciones', value: stageCounts['SEPARACION'] },
      { name: 'Vendidos', value: stageCounts['VENDIDO'] },
      { name: 'Perdidos', value: stageCounts['PERDIDO'] }
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
