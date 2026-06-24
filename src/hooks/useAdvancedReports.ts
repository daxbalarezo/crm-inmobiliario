import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
import type { Lead, UserProfile } from '../types/definitions';

export function useAdvancedReports(timeRange: string = 'this_month') {
  const { tenantId, userProfile } = useCRM();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
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

      // Fetch Leads
      let leadsConstraints: any[] = [];
      if (userProfile?.role !== 'owner') {
        leadsConstraints.push(where('tenantId', '==', tenantId));
      }
      if (startDate) leadsConstraints.push(where('createdAt', '>=', startDate));
      if (endDate) leadsConstraints.push(where('createdAt', '<', endDate));

      const leadsQ = query(collection(db, 'leads'), ...leadsConstraints);
      const leadsSnap = await getDocs(leadsQ);
      const fetchedLeads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      
      fetchedLeads.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setLeads(fetchedLeads);

      // Fetch Activities
      let actsConstraints: any[] = [];
      if (userProfile?.role !== 'owner') {
        actsConstraints.push(where('tenantId', '==', tenantId));
      }
      if (startDate) actsConstraints.push(where('createdAt', '>=', startDate));
      if (endDate) actsConstraints.push(where('createdAt', '<', endDate));

      const actsQ = query(collection(db, 'lead_activities'), ...actsConstraints);
      const actsSnap = await getDocs(actsQ);
      const fetchedActivities = actsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      fetchedActivities.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
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
