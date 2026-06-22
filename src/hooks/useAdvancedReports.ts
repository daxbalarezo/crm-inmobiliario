import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
import type { Lead, UserProfile } from '../types/definitions';

export function useAdvancedReports() {
  const { tenantId, userProfile } = useCRM();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let usersSnap;
      let leadsSnap;
      
      if (userProfile?.role === 'owner') {
        usersSnap = await getDocs(collection(db, 'users'));
        leadsSnap = await getDocs(collection(db, 'leads'));
      } else {
        usersSnap = await getDocs(query(collection(db, 'users'), where('tenantId', '==', tenantId)));
        leadsSnap = await getDocs(query(collection(db, 'leads'), where('tenantId', '==', tenantId)));
      }

      const fetchedUsers = usersSnap.docs.map(d => {
        const data = d.data() as UserProfile;
        return { ...data, uid: d.id, name: String(data.name || '').toUpperCase() };
      }).filter(u => u.role === 'agent');
      setUsers(fetchedUsers);
      
      const fetchedLeads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      
      // Sort client-side to avoid requiring a composite index in Firestore
      fetchedLeads.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setLeads(fetchedLeads);
    } catch (e) {
      console.error('Error fetching leads/users for advanced reports:', e);
    }

    try {
      let actsSnap;
      if (userProfile?.role === 'owner') {
        actsSnap = await getDocs(collection(db, 'lead_activities'));
      } else {
        actsSnap = await getDocs(query(collection(db, 'lead_activities'), where('tenantId', '==', tenantId)));
      }

      const fetchedActivities = actsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedActivities.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setActivities(fetchedActivities);
    } catch (e) {
      console.error('Error fetching activities for advanced reports:', e);
    }

    setLoading(false);
  };

  return { loading, leads, activities, users };
}
