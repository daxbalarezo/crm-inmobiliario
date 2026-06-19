import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
import type { Lead, Unit } from '../types/definitions';

export function useCommercialData() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [inventory, setInventory] = useState<Unit[]>([]);
  const [loading, setLoading]     = useState(true);
  const { authReady, userProfile, tenantId, activeProjectId } = useCRM();

  useEffect(() => {
    if (!authReady) return;

    if (!userProfile || !tenantId) {
      setLeads([]);
      setInventory([]);
      setLoading(false);
      return;
    }

    const effectiveProjectId = activeProjectId ?? 'all';
    setLoading(true);

    // LEADS
    const leadsRef = collection(db, 'leads');
    let leadsQ;
    
    if (userProfile!.role === 'owner') {
      if (effectiveProjectId === 'all') {
        leadsQ = query(leadsRef, orderBy('updatedAt', 'desc'));
      } else {
        leadsQ = query(leadsRef, where('projectId', '==', effectiveProjectId), orderBy('updatedAt', 'desc'));
      }
    } else if (userProfile!.role === 'manager') {
      if (effectiveProjectId === 'all') {
        leadsQ = query(leadsRef, where('tenantId', '==', tenantId), orderBy('updatedAt', 'desc'));
      } else {
        leadsQ = query(leadsRef, where('tenantId', '==', tenantId), where('projectId', '==', effectiveProjectId), orderBy('updatedAt', 'desc'));
      }
    } else {
      if (effectiveProjectId === 'all') {
        leadsQ = query(leadsRef, where('tenantId', '==', tenantId), where('assignedTo', '==', userProfile!.uid), orderBy('updatedAt', 'desc'));
      } else {
        leadsQ = query(leadsRef, where('tenantId', '==', tenantId), where('projectId', '==', effectiveProjectId), where('assignedTo', '==', userProfile!.uid), orderBy('updatedAt', 'desc'));
      }
    }

    const unsubscribeLeads = onSnapshot(leadsQ, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Lead[]);
      setLoading(false);
    }, (err) => {
      console.error('Leads error:', err.message);
      setLeads([]);
      setLoading(false);
    });

    // INVENTORY
    let inventoryQ;
    if (userProfile!.role === 'owner') {
      if (effectiveProjectId === 'all') {
        inventoryQ = query(collection(db, 'inventory'));
      } else {
        inventoryQ = query(collection(db, 'inventory'), where('projectId', '==', effectiveProjectId));
      }
    } else {
      if (effectiveProjectId === 'all') {
        inventoryQ = query(collection(db, 'inventory'), where('tenantId', '==', tenantId));
      } else {
        inventoryQ = query(collection(db, 'inventory'), where('tenantId', '==', tenantId), where('projectId', '==', effectiveProjectId));
      }
    }

    const unsubscribeInventory = onSnapshot(inventoryQ, (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Unit[]);
    }, (err) => {
      console.error('Inventory error:', err.message);
      setInventory([]);
    });

    return () => {
      unsubscribeLeads();
      unsubscribeInventory();
    };
  }, [authReady, userProfile, tenantId, activeProjectId]);

  return { leads, inventory, loading };
}