import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
import type { Lead, UserProfile, LeadActivity } from '../types/definitions';

export interface AgentStats {
  uid: string;
  name: string;
  totalLeads: number;
  closedLeads: number;
  totalVolume: number;
  reservations: number;
  conversionRate: number;
  avgTTFC_hours: number;
}

export interface GlobalStats {
  totalLeads: number;
  totalAgents: number;
  totalClosed: number;
  totalReservations: number;
  avgConv: number;
  topAgent: { name: string; conv: number; sales: number } | null;
  projectedRevenue: number;
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

export function useAdminMetrics(timeRange: string) {
  const { tenantId, userProfile } = useCRM();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalLeads: 0,
    totalAgents: 0,
    totalClosed: 0,
    totalReservations: 0,
    avgConv: 0,
    topAgent: null,
    projectedRevenue: 0
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
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  useEffect(() => {
    if (!loading) {
      computeStats(allLeads, users, allActivities, timeRange);
    }
  }, [timeRange, allLeads, users, allActivities, loading]);

  const loadData = async () => {
    setLoading(true);
    try {
      let usersSnap;
      let leadsSnap;
      let actsSnap;

      if (userProfile?.role === 'owner') {
        usersSnap = await getDocs(collection(db, 'users'));
        leadsSnap = await getDocs(collection(db, 'leads'));
        actsSnap = await getDocs(collection(db, 'lead_activities'));
      } else {
        usersSnap = await getDocs(query(collection(db, 'users'), where('tenantId', '==', tenantId)));
        leadsSnap = await getDocs(query(collection(db, 'leads'), where('tenantId', '==', tenantId)));
        actsSnap = await getDocs(query(collection(db, 'lead_activities'), where('tenantId', '==', tenantId)));
      }

      const fetchedUsers = usersSnap.docs.map(d => {
        const data = d.data() as UserProfile;
        return { ...data, uid: d.id, name: String(data.name || '').toUpperCase() };
      }).filter(u => u.role === 'agent');
      setUsers(fetchedUsers);
      
      const fetchedLeads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setAllLeads(fetchedLeads);

      const fetchedActivities = actsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LeadActivity));
      setAllActivities(fetchedActivities);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const computeStats = (leadsData: Lead[], usersData: UserProfile[], activitiesData: LeadActivity[], range: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let filteredLeads = leadsData;
    let filteredActivities = activitiesData;

    if (range !== 'all') {
      filteredLeads = leadsData.filter(l => {
        if (!l.createdAt) return false;
        const leadDate = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
        if (isNaN(leadDate.getTime())) return false;

        if (range === 'this_month') {
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

        if (range === 'this_month') {
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
        avgTTFC_hours: 0
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
      'VENDIDO': 0
    };
    
    let projectedRevenue = 0;

    const workloadCounts = new Map<string, number>(); // agent uid -> active leads
    usersData.forEach(u => workloadCounts.set(u.uid, 0));

    filteredLeads.forEach(l => {
      if (!l.assignedTo) return;
      const stat = agentStatsMap.get(l.assignedTo);
      if (!stat) return;

      stat.totalLeads++;
      
      if (l.status === 'VENDIDO' || l.status === 'CERRADO') {
        stat.closedLeads++;
        totalClosed++;
        if (l.savedProforma?.finalPrice) {
          stat.totalVolume += l.savedProforma.finalPrice;
        }
      }
      
      if (l.status === 'SEPARACION') {
        stat.reservations++;
        totalReservations++;
      }

      if (l.firstContactAt && l.createdAt) {
        const created = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
        const first = l.firstContactAt?.toDate ? l.firstContactAt.toDate() : new Date(l.firstContactAt);
        
        if (!isNaN(created.getTime()) && !isNaN(first.getTime())) {
          const diffHours = (first.getTime() - created.getTime()) / (1000 * 60 * 60);
          if (diffHours >= 0) {
            const current = ttfcSums.get(stat.uid) || { totalHours: 0, count: 0 };
            ttfcSums.set(stat.uid, {
              totalHours: current.totalHours + diffHours,
              count: current.count + 1
            });
          }
        }
      }

      // Funnel Logic
      if (l.status === 'VENDIDO' || l.status === 'CERRADO') {
        stageCounts['VENDIDO']++;
      } else if (l.status === 'SEPARACION') {
        stageCounts['SEPARACION']++;
      } else if (l.status === 'VISITA') {
        stageCounts['VISITA']++;
      } else if (l.status === 'EN_NEGOCIACION' || l.status === 'EN NEGOCIACION') {
        stageCounts['EN_NEGOCIACION']++;
      } else if (l.status === 'SIN_CONTACTAR' || l.status === 'SIN CONTACTAR' || l.status === 'CONTACTADO') {
        stageCounts['SIN_CONTACTAR']++;
      } else if (l.status === 'PROSPECTO' || l.status === 'NUEVO') {
        stageCounts['PROSPECTO']++;
      }

      // Source Logic
      if (l.source) {
        const sourceName = l.source.trim() || 'Desconocido';
        sourceCounts.set(sourceName, (sourceCounts.get(sourceName) || 0) + 1);
      } else {
        sourceCounts.set('Desconocido', (sourceCounts.get('Desconocido') || 0) + 1);
      }

      // Projected Revenue Logic (Leads in Negotiation or Separation)
      if (l.status === 'EN NEGOCIACION' || l.status === 'SEPARACION') {
        const val = l.savedProforma?.finalPrice || Number(l.customData?.presupuesto) || 0;
        projectedRevenue += val;
      }

      // Loss Reason Logic
      if (l.status === 'PERDIDO') {
        const reason = l.lossReason || 'No especificado';
        lossReasonCounts.set(reason, (lossReasonCounts.get(reason) || 0) + 1);
      }

      // Workload Logic (Active leads: not VENDIDO, not PERDIDO, not CERRADO)
      if (l.status !== 'VENDIDO' && l.status !== 'CERRADO' && l.status !== 'PERDIDO') {
        workloadCounts.set(l.assignedTo, (workloadCounts.get(l.assignedTo) || 0) + 1);
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
      projectedRevenue
    });

    // Format Data for Charts
    setFunnelData([
      { stage: 'Prospectos', count: stageCounts['PROSPECTO'] },
      { stage: 'Sin Contactar', count: stageCounts['SIN_CONTACTAR'] },
      { stage: 'Negociación', count: stageCounts['EN_NEGOCIACION'] },
      { stage: 'Visitas', count: stageCounts['VISITA'] },
      { stage: 'Separaciones', count: stageCounts['SEPARACION'] },
      { stage: 'Vendidos', count: stageCounts['VENDIDO'] }
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
