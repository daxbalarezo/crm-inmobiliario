import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import { useGlobalData } from '../context/GlobalDataProvider';
import type { Lead, UserProfile } from '../types/definitions';

export function useAdvancedReports(timeRange: string = 'this_month') {
  const { tenantId, userProfile } = useCRM();
  const { leads: globalLeads, loading: globalLoading } = useGlobalData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!tenantId || globalLoading) return;
    loadData();
  }, [tenantId, timeRange, globalLoading]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Users
      let usersQuery = supabase.from('users').select('*');
      if (userProfile?.role !== 'owner') {
        usersQuery = usersQuery.eq('tenant_id', tenantId);
      }
      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      const fetchedUsers = (usersData || []).map(row => ({
        uid: row.uid,
        tenantId: row.tenant_id,
        role: row.role,
        name: String(row.name || '').toUpperCase(),
        email: row.email
      }) as UserProfile).filter(u => u.role !== 'owner' && u.role !== 'manager');
      setUsers(fetchedUsers);
      
      // Calculate Date Range
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      const now = new Date();
      
      if (timeRange === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === 'last_6_months') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      } else if (timeRange === 'this_year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Filter Leads from Global Cache
      let filteredLeads = globalLeads;
      if (userProfile?.role !== 'owner') {
        filteredLeads = filteredLeads.filter(l => l.tenantId === tenantId);
      }
      if (startDate) {
        filteredLeads = filteredLeads.filter(l => l.createdAt && new Date(l.createdAt) >= startDate!);
      }
      if (endDate) {
        filteredLeads = filteredLeads.filter(l => l.createdAt && new Date(l.createdAt) < endDate!);
      }
      
      filteredLeads.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setLeads(filteredLeads);

      // Fetch Activities
      let actsQuery = supabase.from('lead_activities').select('*');
      if (userProfile?.role !== 'owner') {
        actsQuery = actsQuery.eq('tenant_id', tenantId);
      }
      if (startDate) actsQuery = actsQuery.gte('created_at', startDate.toISOString());
      if (endDate) actsQuery = actsQuery.lt('created_at', endDate.toISOString());

      const { data: actsData, error: actsError } = await actsQuery;
      if (actsError) throw actsError;

      const fetchedActivities = (actsData || []).map(row => ({
        id: row.id,
        leadId: row.lead_id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        type: row.type,
        notes: row.notes,
        createdAt: row.created_at
      }));
      
      fetchedActivities.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setActivities(fetchedActivities);

    } catch (e: any) {
      console.error('Error fetching data for advanced reports:', e);
      setError(e.message || 'Error fetching data. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, leads, activities, users };
}
