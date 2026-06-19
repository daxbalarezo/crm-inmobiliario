import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { RolePermission } from '../types/definitions';

export function useRoles(tenantId: string | undefined) {
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, `tenants/${tenantId}/roles`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedRoles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RolePermission[];
      
      setRoles(loadedRoles);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching roles:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  return { roles, loading };
}
