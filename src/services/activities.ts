import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { LeadActivity } from '../types/definitions';

export const logActivityService = async (
  tenantId: string,
  leadId: string, 
  userId: string, 
  userName: string, 
  actionType: LeadActivity['actionType'], 
  description: string, 
  metadata?: any
) => {
  if (!tenantId) return;
  try {
    await addDoc(collection(db, 'lead_activities'), {
      tenantId,
      leadId,
      userId,
      userName,
      actionType,
      description,
      metadata: metadata || null,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Error logging activity:", e);
  }
};

export const getLeadActivitiesService = async (tenantId: string, leadId: string): Promise<LeadActivity[]> => {
  if (!tenantId) return [];
  try {
    const q = query(
      collection(db, 'lead_activities'),
      where('tenantId', '==', tenantId),
      where('leadId', '==', leadId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as LeadActivity));
  } catch (e) {
    console.error("Error fetching lead activities:", e);
    return [];
  }
};
