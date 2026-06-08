import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from '../config/firebase';
import type { Lead } from '../types/definitions'; 

const COLLECTION_NAME = 'leads'; 

const cleanPayload = (data: Partial<Lead>) => {
  const payload = { ...data };
  if (payload.area) payload.area = Number(payload.area);
  if (payload.price) payload.price = Number(payload.price);
  return payload;
};

/**
 * Servicio de Persistencia SaaS
 * Obliga al paso de tenantId y projectId para garantizar aislamiento de datos.
 */
export const saveLeadService = async (
  formData: any, 
  editingId: string | null,
  tenantId: string, 
  projectId: string,
  ownerId: string
) => {
  try {
    const cleanData = cleanPayload(formData);
    
    // El payload ahora es autogestionado por la arquitectura
    const payload = { 
      ...cleanData, 
      tenantId, 
      projectId,
      ownerId,
      updatedAt: serverTimestamp() 
    };

    if (editingId) {
      await updateDoc(doc(db, COLLECTION_NAME, editingId), payload);
    } else {
      await addDoc(collection(db, COLLECTION_NAME), { 
        ...payload, 
        createdAt: serverTimestamp() 
      });
    }
    return { success: true };
  } catch (error) {
    console.error("🚨 Error crítico en persistencia multi-tenant:", error);
    throw error;
  }
};

export const deleteLeadService = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return { success: true };
  } catch (error) {
    console.error("🚨 Error al eliminar lead:", error);
    throw error;
  }
};

export const completeTaskService = async (lead: Lead, tenantId: string) => {
  try {
    const note = { 
      id: Date.now().toString(), 
      date: new Date().toISOString(), 
      type: 'Sistema', 
      note: `✅ Completado: ${lead.nextFollowUpNote || ''}`,
      tenantId 
    };
    
    const updatedInteractions = [note, ...(lead.interactions || [])];
    
    await updateDoc(doc(db, COLLECTION_NAME, lead.id!), { 
        interactions: updatedInteractions, 
        nextFollowUpDate: null, 
        nextFollowUpNote: ''    
    });
    return { success: true };
  } catch (error) {
    console.error("🚨 Error al completar tarea:", error);
    throw error;
  }
};