import { useState } from 'react';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AuditEvent } from '../types/definitions';

export function useAuditTrail(tenantId: string) {
  const [loading, setLoading] = useState(false);

  const logEvent = async (
    userId: string,
    userName: string,
    action: AuditEvent['action'],
    resource: AuditEvent['resource'],
    resourceId: string,
    details: string
  ) => {
    if (!tenantId || !userId) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        tenantId,
        userId,
        userName,
        action,
        resource,
        resourceId,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging audit event:", error);
    }
  };

  const getRecentLogs = async (maxResults = 50) => {
    if (!tenantId) return [];
    setLoading(true);
    try {
      const logsRef = collection(db, 'audit_logs');
      // Solo filtramos por tenantId para evitar requerir un Composite Index de Firebase.
      // El ordenamiento y límite lo hacemos en memoria.
      const q = query(
        logsRef,
        where('tenantId', '==', tenantId)
      );
      
      const snapshot = await getDocs(q);
      let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AuditEvent[];
      
      // Ordenar por fecha descendente en memoria
      logs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      // Limitar a maxResults
      logs = logs.slice(0, maxResults);
      
      setLoading(false);
      return logs;
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setLoading(false);
      return [];
    }
  };

  return {
    loading,
    logEvent,
    getRecentLogs
  };
}
