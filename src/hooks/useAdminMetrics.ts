import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import { useGlobalData } from '../context/GlobalDataProvider';
import type { Lead, UserProfile, LeadActivity } from '../types/definitions';

// Extendemos Lead con una propiedad temporal para la vista de SLA
export type SLALead = Lead & { _ttfcHours?: number };

export interface AgentStats {
  uid: string;
  name: string;
  totalLeads: number;
  closedLeads: number;
  totalVolume: number;
  reservations: number;
  conversionRate: number;
  avgTTFC_hours: number;
  slaCompliantLeads: number;
  totalContactedLeads: number;
  uncontactedLeads: number;
  maxTTFC_hours: number;
  compliantLeadsList: SLALead[];
  nonCompliantLeadsList: SLALead[];
  uncontactedLeadsList: SLALead[];
  worstLead: SLALead | null;
}

export interface GlobalStats {
  totalLeads: number;
  totalAgents: number;
  totalClosed: number;
  totalReservations: number;
  avgConv: number;
  topAgent: { name: string; conv: number; sales: number } | null;
  projectedRevenue: number;
  actualRevenue: number;
}

export interface LossReasonData {
  reason: string;
  count: number;
}

export interface ActivityData {
  name: string;
  activities: number;
}

export interface FunnelData {
  stage: string;
  count: number;
}

export interface SourceData {
  name: string;
  value: number;
}

export interface WorkloadData {
  name: string;
  activeLeads: number;
}

export function useAdminMetrics(timeRange: string, customStartDate?: string, customEndDate?: string) {
  const { tenantId, userProfile, tenant } = useCRM();
  const { leads: globalLeads, loading: globalLoading } = useGlobalData();
  const slaTargetHours = tenant?.slaTargetHours || 2;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalLeads: 0,
    totalAgents: 0,
    totalClosed: 0,
    totalReservations: 0,
    avgConv: 0,
    topAgent: null,
    projectedRevenue: 0,
    actualRevenue: 0
  });
  
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [lossReasonData, setLossReasonData] = useState<LossReasonData[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allActivities, setAllActivities] = useState<LeadActivity[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!tenantId || globalLoading) return;
    loadData();
  }, [tenantId, globalLoading]);

  useEffect(() => {
    if (!loading) {
      computeStats(allLeads, users, allActivities, timeRange, customStartDate, customEndDate);
    }
  }, [timeRange, customStartDate, customEndDate, allLeads, users, allActivities, loading]);

  const loadData = async () => {
    setLoading(true);
    try {
      let usersQuery = supabase.from('users').select('*');
      let actsQuery = supabase.from('lead_activities').select('*');

      if (userProfile?.role !== 'owner') {
        usersQuery = usersQuery.eq('tenant_id', tenantId);
        actsQuery = actsQuery.eq('tenant_id', tenantId);
      }

      const [usersRes, actsRes] = await Promise.all([
        usersQuery,
        actsQuery
      ]);

      if (usersRes.error) throw usersRes.error;
      if (actsRes.error) throw actsRes.error;

      const fetchedUsers = (usersRes.data || []).map(row => ({
        uid: row.uid,
        tenantId: row.tenant_id,
        role: row.role,
        name: String(row.name || '').toUpperCase(),
        email: row.email
      }) as UserProfile).filter(u => u.role !== 'owner' && u.role !== 'manager');
      setUsers(fetchedUsers);
      
      const fetchedActivities = (actsRes.data || []).map(row => ({
        id: row.id,
        leadId: row.lead_id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        type: row.type,
        notes: row.notes,
        createdAt: row.created_at,
        metadata: row.metadata
      }) as LeadActivity);
      setAllActivities(fetchedActivities);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Sync globalLeads a allLeads dinámicamente para soportar Realtime
  useEffect(() => {
    let fetchedLeads = globalLeads;
    if (userProfile?.role !== 'owner') {
      fetchedLeads = fetchedLeads.filter(l => l.tenantId === tenantId);
    }
    setAllLeads(fetchedLeads);
  }, [globalLeads, tenantId, userProfile?.role]);

  const computeStats = (leadsData: Lead[], usersData: UserProfile[], activitiesData: LeadActivity[], range: string, customStart?: string, customEnd?: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let filteredLeads = leadsData;
    let filteredActivities = activitiesData;

    if (range === 'custom' && customStart && customEnd) {
      const startD = new Date(`${customStart}T00:00:00`);
      const endD = new Date(`${customEnd}T23:59:59`);
      filteredLeads = leadsData.filter(l => {
        if (!l.createdAt) return false;
        const leadDate = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
        if (isNaN(leadDate.getTime())) return false;
        return leadDate >= startD && leadDate <= endD;
      });
      filteredActivities = activitiesData.filter(a => {
        if (!a.createdAt) return false;
        const actDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        if (isNaN(actDate.getTime())) return false;
        return actDate >= startD && actDate <= endD;
      });
    } else if (range !== 'all') {
      filteredLeads = leadsData.filter(l => {
        if (!l.createdAt) return false;
        const leadDate = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
        if (isNaN(leadDate.getTime())) return false;

        if (range === 'today') {
          return leadDate.getFullYear() === currentYear && leadDate.getMonth() === currentMonth && leadDate.getDate() === now.getDate();
        } else if (range === 'this_week') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(currentYear, currentMonth, diff);
          return leadDate >= startOfWeek;
        } else if (range === 'this_month') {
          return leadDate.getFullYear() === currentYear && leadDate.getMonth() === currentMonth;
        } else if (range === 'last_month') {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const year = currentMonth === 0 ? currentYear - 1 : currentYear;
          return leadDate.getFullYear() === year && leadDate.getMonth() === lastMonth;
        } else if (range === 'last_6_months') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return leadDate >= sixMonthsAgo;
        } else if (range === 'this_year') {
          return leadDate.getFullYear() === currentYear;
        }
        return true;
      });

      filteredActivities = activitiesData.filter(a => {
        if (!a.createdAt) return false;
        const actDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        if (isNaN(actDate.getTime())) return false;

        if (range === 'today') {
          return actDate.getFullYear() === currentYear && actDate.getMonth() === currentMonth && actDate.getDate() === now.getDate();
        } else if (range === 'this_week') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(currentYear, currentMonth, diff);
          return actDate >= startOfWeek;
        } else if (range === 'this_month') {
          return actDate.getFullYear() === currentYear && actDate.getMonth() === currentMonth;
        } else if (range === 'last_month') {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const year = currentMonth === 0 ? currentYear - 1 : currentYear;
          return actDate.getFullYear() === year && actDate.getMonth() === lastMonth;
        } else if (range === 'last_6_months') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return actDate >= sixMonthsAgo;
        } else if (range === 'this_year') {
          return actDate.getFullYear() === currentYear;
        }
        return true;
      });
    }

    let totalClosed = 0;
    let totalReservations = 0;
    const agentStatsMap = new Map<string, AgentStats>();

    usersData.forEach(u => {
      agentStatsMap.set(u.uid, {
        uid: u.uid,
        name: u.name,
        totalLeads: 0,
        closedLeads: 0,
        totalVolume: 0,
        reservations: 0,
        conversionRate: 0,
        avgTTFC_hours: 0,
        slaCompliantLeads: 0,
        totalContactedLeads: 0,
        uncontactedLeads: 0,
        maxTTFC_hours: 0,
        compliantLeadsList: [],
        nonCompliantLeadsList: [],
        uncontactedLeadsList: [],
        worstLead: null
      });
    });

    const ttfcSums = new Map<string, { totalHours: number; count: number }>();
    const sourceCounts = new Map<string, number>();
    const lossReasonCounts = new Map<string, number>();
    const stageCounts = {
      'PROSPECTO': 0,
      'SIN_CONTACTAR': 0,
      'EN_NEGOCIACION': 0,
      'VISITA': 0,
      'SEPARACION': 0,
      'VENDIDO': 0,
      'PERDIDO': 0
    };
    
    let projectedRevenue = 0;
    let actualRevenue = 0;

    const workloadCounts = new Map<string, number>(); // agent uid -> active leads
    usersData.forEach(u => workloadCounts.set(u.uid, 0));

    filteredLeads.forEach(l => {
      // Global Logic (Applies to ALL leads regardless of assignment)
      
      const statusStr = (l.status || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Funnel Logic
      if (statusStr.includes('VENDIDO') || statusStr.includes('CERRADO')) {
        stageCounts['VENDIDO']++;
        totalClosed++;
      } else if (statusStr.includes('SEPARACION') || statusStr.includes('SEPARACIONES')) {
        stageCounts['SEPARACION']++;
        totalReservations++;
      } else if (statusStr.includes('VISITA') || statusStr.includes('VISITAS')) {
        stageCounts['VISITA']++;
      } else if (statusStr.includes('NEGOCIACION') || statusStr.includes('NEGOCIACIONES')) {
        stageCounts['EN_NEGOCIACION']++;
      } else if (statusStr.includes('SIN CONTACTAR') || statusStr.includes('CONTACTADO') || statusStr.includes('CONTACTAR')) {
        stageCounts['SIN_CONTACTAR']++;
      } else if (statusStr.includes('PROSPECTO') || statusStr.includes('NUEVO')) {
        stageCounts['PROSPECTO']++;
      } else if (statusStr.includes('PERDIDO')) {
        stageCounts['PERDIDO']++;
      }

      // Source Logic
      if (l.source) {
        const sourceName = l.source.trim() || 'Desconocido';
        sourceCounts.set(sourceName, (sourceCounts.get(sourceName) || 0) + 1);
      } else {
        sourceCounts.set('Desconocido', (sourceCounts.get('Desconocido') || 0) + 1);
      }

      // Projected Revenue Logic (Leads in Negotiation or Separation)
      if (statusStr.includes('NEGOCIACION') || statusStr.includes('SEPARACION')) {
        const val = l.savedProforma?.finalPrice || Number(l.customData?.presupuesto) || 0;
        projectedRevenue += val;
      }

      // Actual Revenue Logic (Leads Sold)
      if (statusStr.includes('VENDIDO') || statusStr.includes('CERRADO')) {
        const val = l.savedProforma?.finalPrice || Number(l.customData?.presupuesto) || 0;
        actualRevenue += val;
      }

      // Loss Reason Logic
      if (statusStr.includes('PERDIDO')) {
        const reason = l.lossReason || 'No especificado';
        lossReasonCounts.set(reason, (lossReasonCounts.get(reason) || 0) + 1);
      }

      // Workload Logic (Active leads: not VENDIDO, not PERDIDO, not CERRADO)
      if (!statusStr.includes('VENDIDO') && !statusStr.includes('CERRADO') && !statusStr.includes('PERDIDO')) {
        if (l.assignedTo) {
          workloadCounts.set(l.assignedTo, (workloadCounts.get(l.assignedTo) || 0) + 1);
        }
      }

      // Agent-Specific Logic
      if (l.assignedTo) {
        const stat = agentStatsMap.get(l.assignedTo);
        if (stat) {
          stat.totalLeads++;
          
          if (statusStr === 'VENDIDO' || statusStr === 'CERRADO') {
            stat.closedLeads++;
            if (l.savedProforma?.finalPrice) {
              stat.totalVolume += l.savedProforma.finalPrice;
            }
          }
          
          if (statusStr === 'SEPARACION' || statusStr === 'SEPARACIONES') {
            stat.reservations++;
          }

          if (l.firstContactAt && l.createdAt) {
            const created = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
            const first = l.firstContactAt?.toDate ? l.firstContactAt.toDate() : new Date(l.firstContactAt);
            
            if (!isNaN(created.getTime()) && !isNaN(first.getTime())) {
              const diffHours = (first.getTime() - created.getTime()) / (1000 * 60 * 60);
              if (diffHours >= 0) {
                stat.totalContactedLeads++;
                
                const slaLead: SLALead = { ...l, _ttfcHours: diffHours };

                if (diffHours <= slaTargetHours) {
                  stat.slaCompliantLeads++;
                  stat.compliantLeadsList.push(slaLead);
                } else {
                  stat.nonCompliantLeadsList.push(slaLead);
                }

                if (diffHours > stat.maxTTFC_hours) {
                  stat.maxTTFC_hours = diffHours;
                  stat.worstLead = slaLead;
                }

                const current = ttfcSums.get(stat.uid) || { totalHours: 0, count: 0 };
                ttfcSums.set(stat.uid, {
                  totalHours: current.totalHours + diffHours,
                  count: current.count + 1
                });
              }
            }
          } else {
            // No contact logged
            const created = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt || Date.now());
            if (!isNaN(created.getTime())) {
              const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
              if (diffHours > slaTargetHours) {
                stat.uncontactedLeads++;
                stat.uncontactedLeadsList.push({ ...l, _ttfcHours: diffHours });
              }
            }
          }
        }
      }
    });

    // Productivity Logic
    const activityCounts = new Map<string, number>();
    filteredActivities.forEach(a => {
      activityCounts.set(a.userId, (activityCounts.get(a.userId) || 0) + 1);
    });

    let maxConv = -1;
    let topAgt: { name: string; conv: number; sales: number } | null = null;

    const finalStats: AgentStats[] = [];
    agentStatsMap.forEach((stat, uid) => {
      stat.conversionRate = stat.totalLeads > 0 ? (stat.closedLeads / stat.totalLeads) * 100 : 0;
      
      const ttfcData = ttfcSums.get(uid);
      if (ttfcData && ttfcData.count > 0) {
        stat.avgTTFC_hours = ttfcData.totalHours / ttfcData.count;
      }

      if (stat.conversionRate > maxConv && stat.totalLeads > 0) {
        maxConv = stat.conversionRate;
        topAgt = { name: stat.name, conv: stat.conversionRate, sales: stat.closedLeads };
      }
      
      finalStats.push(stat);
    });

    finalStats.sort((a, b) => b.closedLeads - a.closedLeads || b.conversionRate - a.conversionRate);

    const totalLeads = filteredLeads.length;
    const globalConv = totalLeads > 0 ? (totalClosed / totalLeads) * 100 : 0;

    setStats(finalStats);
    setGlobalStats({
      totalLeads,
      totalAgents: usersData.length,
      totalClosed,
      totalReservations,
      avgConv: totalLeads > 0 ? (totalClosed / totalLeads) * 100 : 0,
      topAgent: topAgt,
      projectedRevenue,
      actualRevenue
    });

    // Format Data for Charts
    setFunnelData([
      { stage: 'Prospectos', count: stageCounts['PROSPECTO'] },
      { stage: 'Sin Contactar', count: stageCounts['SIN_CONTACTAR'] },
      { stage: 'Negociación', count: stageCounts['EN_NEGOCIACION'] },
      { stage: 'Visitas', count: stageCounts['VISITA'] },
      { stage: 'Separaciones', count: stageCounts['SEPARACION'] },
      { stage: 'Vendidos', count: stageCounts['VENDIDO'] },
      { stage: 'Perdidos', count: stageCounts['PERDIDO'] }
    ]);

    const formattedSourceData = Array.from(sourceCounts.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    setSourceData(formattedSourceData);

    const formattedWorkloadData = Array.from(workloadCounts.entries()).map(([uid, activeLeads]) => {
      const agent = usersData.find(u => u.uid === uid);
      return {
        name: agent ? agent.name.split(' ')[0] : 'Unknown',
        activeLeads
      };
    }).sort((a, b) => b.activeLeads - a.activeLeads).slice(0, 10);
    setWorkloadData(formattedWorkloadData);

    const formattedLossReasons = Array.from(lossReasonCounts.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
    setLossReasonData(formattedLossReasons);

    const formattedActivityData = Array.from(activityCounts.entries()).map(([uid, activities]) => {
      const agent = usersData.find(u => u.uid === uid);
      return {
        name: agent ? agent.name.split(' ')[0] : 'Unknown',
        activities
      };
    }).sort((a, b) => b.activities - a.activities).slice(0, 10);
    setActivityData(formattedActivityData);

  };

  return { loading, stats, globalStats, funnelData, sourceData, workloadData, lossReasonData, activityData, allLeads, users };
}
