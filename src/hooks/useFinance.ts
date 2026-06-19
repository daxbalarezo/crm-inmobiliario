import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, getDoc, doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Payment } from '../types/definitions';
import { useAuditTrail } from './useAuditTrail';
import { useCRM } from '../context/CRMContext';

export function useFinance(tenantId?: string) {
  const { userProfile } = useCRM();
  const { logEvent } = useAuditTrail(tenantId || '');
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga automática de pagos pendientes para un tenant (vista del contador)
  useEffect(() => {
    if (!tenantId) {
      setAllPayments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'payments'),
      where('tenantId', '==', tenantId)
    );

    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      // Sort client-side to avoid requiring composite index
      data.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      setAllPayments(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching pending payments:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [tenantId]);

  // Obtener pagos de un prospecto específico
  const getLeadPayments = async (leadId: string) => {
    try {
      const q = query(
        collection(db, 'payments'),
        where('leadId', '==', leadId)
      );
      const snap = await getDocs(q);
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      data.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      return data;
    } catch (e) {
      console.error("Error fetching lead payments:", e);
      return [];
    }
  };

  // Registrar un nuevo pago (Asesor)
  const createPayment = async (data: Omit<Payment, 'id' | 'createdAt' | 'status'>) => {
    try {
      const newRef = doc(collection(db, 'payments'));
      const payment: Payment = {
        ...data,
        id: newRef.id,
        status: 'PENDING',
        createdAt: serverTimestamp()
      };
      await setDoc(newRef, payment);
      return payment;
    } catch (e) {
      console.error("Error creating payment:", e);
      throw e;
    }
  };

  // Aprobar pago (Contador/Admin)
  const approvePayment = async (paymentId: string, approvedBy: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'APPROVED',
        approvedBy,
        updatedAt: serverTimestamp()
      });
      if (userProfile) {
        await logEvent(userProfile.uid, userProfile.name, 'APPROVE', 'PAYMENT', paymentId, `Pago aprobado`);
      }
    } catch (e) {
      console.error("Error approving payment:", e);
      throw e;
    }
  };

  // Rechazar pago (Contador/Admin)
  const rejectPayment = async (paymentId: string, approvedBy: string, notes?: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'REJECTED',
        approvedBy,
        notes: notes || 'Rechazado por el administrador',
        updatedAt: serverTimestamp()
      });
      if (userProfile) {
        await logEvent(userProfile.uid, userProfile.name, 'REJECT', 'PAYMENT', paymentId, `Pago rechazado. Motivo: ${notes || 'Rechazado por el administrador'}`);
      }
    } catch (e) {
      console.error("Error rejecting payment:", e);
      throw e;
    }
  };

  // Obtener plantilla de contrato
  const getContractTemplate = async () => {
    if (!tenantId) return null;
    try {
      console.log('Fetching contract template for tenant:', tenantId);
      const docRef = doc(db, 'contract_templates', tenantId);
      const snap = await getDoc(docRef);
      console.log('Fetched template:', snap.exists());
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as any;
      }
      return null;
    } catch (e) {
      console.error("Error fetching template:", e);
      return null;
    }
  };

  // Guardar plantilla de contrato
  const saveContractTemplate = async (docxBase64: string) => {
    if (!tenantId) return;
    try {
      const docRef = doc(db, 'contract_templates', tenantId);
      await setDoc(docRef, {
        id: tenantId,
        tenantId,
        name: 'Plantilla Principal',
        docxBase64,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving template:", e);
      throw e;
    }
  };

  return {
    allPayments,
    loading,
    getLeadPayments,
    createPayment,
    approvePayment,
    rejectPayment,
    getContractTemplate,
    saveContractTemplate
  };
}
