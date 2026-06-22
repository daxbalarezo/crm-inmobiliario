import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, getDoc, doc, setDoc, updateDoc, serverTimestamp, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
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

  // Obtener plantilla por defecto (o la única existente por retrocompatibilidad)
  const getContractTemplate = async () => {
    if (!tenantId) return null;
    try {
      const q = query(collection(db, 'contract_templates'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const templates = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      if (templates.length === 0) return null;
      return templates.find(t => t.isDefault) || templates[0];
    } catch (e) {
      console.error("Error fetching template:", e);
      return null;
    }
  };

  // Obtener todas las plantillas
  const getContractTemplates = async () => {
    if (!tenantId) return [];
    try {
      const q = query(collection(db, 'contract_templates'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const templates = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Ordenar para que la default aparezca primero
      return templates.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    } catch (e) {
      console.error("Error fetching templates:", e);
      return [];
    }
  };

  // Subir nueva plantilla
  const uploadContractTemplate = async (name: string, docxBase64: string, size: number) => {
    if (!tenantId) return;
    try {
      const existing = await getContractTemplates();
      if (existing.length >= 5) {
        throw new Error("Límite alcanzado: Máximo 5 plantillas.");
      }
      const isDefault = existing.length === 0;
      await addDoc(collection(db, 'contract_templates'), {
        tenantId,
        name,
        docxBase64,
        size,
        isDefault,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error uploading template:", e);
      throw e;
    }
  };

  // Guardar/Actualizar plantilla antigua (retrocompatibilidad)
  const saveContractTemplate = async (docxBase64: string) => {
    if (!tenantId) return;
    try {
      const docRef = doc(db, 'contract_templates', tenantId);
      await setDoc(docRef, {
        id: tenantId,
        tenantId,
        name: 'Plantilla Principal',
        docxBase64,
        isDefault: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving template:", e);
      throw e;
    }
  };

  // Eliminar plantilla
  const deleteContractTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contract_templates', id));
    } catch (e) {
      console.error("Error deleting template:", e);
      throw e;
    }
  };

  // Renombrar plantilla
  const renameContractTemplate = async (id: string, newName: string) => {
    try {
      await updateDoc(doc(db, 'contract_templates', id), {
        name: newName,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error renaming template:", e);
      throw e;
    }
  };

  // Marcar como predeterminada
  const setDefaultContractTemplate = async (id: string) => {
    if (!tenantId) return;
    try {
      const existing = await getContractTemplates();
      const batchUpdate = existing.map(async (tpl) => {
        const ref = doc(db, 'contract_templates', tpl.id);
        if (tpl.id === id) {
          await updateDoc(ref, { isDefault: true, updatedAt: serverTimestamp() });
        } else if (tpl.isDefault) {
          await updateDoc(ref, { isDefault: false, updatedAt: serverTimestamp() });
        }
      });
      await Promise.all(batchUpdate);
    } catch (e) {
      console.error("Error setting default template:", e);
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
    getContractTemplates,
    saveContractTemplate,
    uploadContractTemplate,
    deleteContractTemplate,
    renameContractTemplate,
    setDefaultContractTemplate
  };
}
