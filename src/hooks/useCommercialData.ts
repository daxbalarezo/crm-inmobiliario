import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
import type { Lead, Unit } from '../types/definitions';

export function useCommercialData() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [inventory, setInventory] = useState<Unit[]>([]);
  const [loading, setLoading]     = useState(true);
  const { authReady, userProfile, tenantId, activeProjectId } = useCRM();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!userProfile || !tenantId) {
      setLeads([]);
      setInventory([]);
      setLoading(false);
      return;
    }

    const effectiveProjectId = activeProjectId ?? 'valle_pacora';
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        // LEADS
        const leadsRef = collection(db, 'leads');
        const leadsQ = (userProfile!.role === 'owner' || userProfile!.role === 'manager')
          ? query(
              leadsRef,
              where('tenantId',  '==', tenantId),
              where('projectId', '==', effectiveProjectId),
              orderBy('updatedAt', 'desc')
            )
          : query(
              leadsRef,
              where('tenantId',   '==', tenantId),
              where('projectId',  '==', effectiveProjectId),
              where('assignedTo', '==', userProfile!.uid),
              orderBy('updatedAt', 'desc')
            );

        const leadsSnap = await getDocs(leadsQ);
        if (!cancelled) {
          setLeads(leadsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Lead[]);
        }
      } catch (err: any) {
        console.error('Leads error:', err.message);
        if (!cancelled) setLeads([]);
      }

      try {
        // INVENTARIO
        const inventoryQ = query(
          collection(db, 'inventory'),
          where('tenantId',  '==', tenantId),
          where('projectId', '==', effectiveProjectId)
        );
        const inventorySnap = await getDocs(inventoryQ);
        if (!cancelled) {
          setInventory(inventorySnap.docs.map(d => ({ id: d.id, ...d.data() })) as Unit[]);
        }
      } catch (err: any) {
        console.error('Inventory error:', err.message);
        if (!cancelled) setInventory([]);
      }

      if (!cancelled) setLoading(false);
    }

    fetchData();

    return () => { cancelled = true; };
  }, [authReady, userProfile, tenantId, activeProjectId]);

  return { leads, inventory, loading };
}