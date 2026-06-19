import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCRM } from '../context/CRMContext';
import type { CustomFieldDefinition } from '../types/definitions';

export function useTenantSchema(entityType: 'lead' = 'lead') {
  const { tenantId } = useCRM();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setFields([]);
      setLoading(false);
      return;
    }

    // e.g. path: tenants/TENANT_ID/schema_lead
    const schemaRef = collection(db, 'tenants', tenantId, `schema_${entityType}`);
    const q = query(schemaRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomFieldDefinition[];
      setFields(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching tenant schema:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId, entityType]);

  return { fields, loading };
}
