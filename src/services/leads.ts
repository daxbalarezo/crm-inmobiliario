import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from '../config/firebase';
import type { Lead } from '../types/definitions'; 

const cleanPayload = (data: Partial<Lead>) => {
  const payload = { ...data };
  if (payload.nextFollowUpDate === undefined) delete payload.nextFollowUpDate;
  if (payload.nextFollowUpNote === undefined) delete payload.nextFollowUpNote;
  
  if (payload.area) payload.area = Number(payload.area);
  if (payload.price) payload.price = Number(payload.price);
  if (payload.downPayment) payload.downPayment = Number(payload.downPayment);
  if (payload.floor) payload.floor = Number(payload.floor);

  return payload;
};

export const importLeadsBatchService = async (
  leads: Partial<Lead>[], 
  activeModule: 'LOTE' | 'DEPA'
) => {
  try {
    const batch = writeBatch(db);
    const leadsCollection = collection(db, 'crm_leads');

    leads.forEach((leadData) => {
      const newDocRef = doc(leadsCollection);
      const payload = cleanPayload({
        ...leadData,
        type: activeModule,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        interactions: []
      });
      batch.set(newDocRef, payload);
    });

    await batch.commit();
    return { success: true, count: leads.length };
  } catch (error) {
    console.error("Error en importación masiva:", error);
    throw error;
  }
};

export const saveLeadService = async (
  formData: Partial<Lead>, 
  activeModule: 'LOTE' | 'DEPA', 
  editingId: string | null
) => {
  try {
    const payload = cleanPayload({
      ...formData,
      type: activeModule,
      updatedAt: serverTimestamp()
    });

    if (editingId) {
      const leadRef = doc(db, 'crm_leads', editingId);
      await updateDoc(leadRef, payload);
      return { success: true };
    } else {
      await addDoc(collection(db, 'crm_leads'), {
        ...payload,
        createdAt: serverTimestamp()
      });
      return { success: true };
    }
  } catch (error) {
    console.error("Error al guardar:", error);
    throw error;
  }
};

export const deleteLeadService = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'crm_leads', id));
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const completeTaskService = async (lead: Lead) => {
  try {
    const note = { 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        type: 'Sistema', 
        note: `✅ Completado: ${lead.nextFollowUpNote}` 
    };
    const updatedInteractions = [note, ...(lead.interactions || [])];
    await updateDoc(doc(db, 'crm_leads', lead.id), { 
        interactions: updatedInteractions, 
        nextFollowUpDate: null, 
        nextFollowUpNote: ''    
    });
    return { success: true };
  } catch (error) {
    throw error;
  }
};