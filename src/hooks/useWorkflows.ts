import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Workflow, WorkflowTriggerType } from '../types/definitions';

export function useWorkflows() {

  const executeWorkflows = async (tenantId: string, trigger: WorkflowTriggerType, payload: any) => {
    // TODO: Migrate workflows engine to Supabase
    // Returning early to prevent Firebase permission errors
    return;
    try {
      // 1. Fetch active workflows for this tenant and trigger
      const q = query(
        collection(db, 'workflows'), 
        where('tenantId', '==', tenantId),
        where('trigger', '==', trigger),
        where('isActive', '==', true)
      );
      const snap = await getDocs(q);
      const workflows = snap.docs.map(d => ({ id: d.id, ...d.data() } as Workflow));

      // 2. Evaluate each workflow
      for (const wf of workflows) {
        let conditionMet = true;

        // Evaluate conditions (ALL must match)
        for (const cond of wf.conditions) {
          const payloadValue = payload[cond.field];
          
          switch (cond.operator) {
            case 'equals':
              if (String(payloadValue).toLowerCase() !== String(cond.value).toLowerCase()) conditionMet = false;
              break;
            case 'contains':
              if (!String(payloadValue).toLowerCase().includes(String(cond.value).toLowerCase())) conditionMet = false;
              break;
            case 'greater_than':
              if (Number(payloadValue) <= Number(cond.value)) conditionMet = false;
              break;
            case 'less_than':
              if (Number(payloadValue) >= Number(cond.value)) conditionMet = false;
              break;
          }
        }

        // 3. Execute actions if conditions met
        if (conditionMet) {
          console.log(`[Workflow Engine] Workflow "${wf.name}" triggered! Executing actions...`);
          
          for (const action of wf.actions) {
            if (action.type === 'assign_to') {
              // Action: Assign to specific user(s)
              const targetAgents = action.payload.split(',').filter((id: string) => id.trim() !== '');
              
              if (targetAgents.length === 1) {
                await updateDoc(doc(db, 'leads', payload.id), {
                  assignedTo: targetAgents[0],
                  updatedAt: serverTimestamp()
                });
                payload.assignedTo = targetAgents[0];
              } else if (targetAgents.length > 1) {
                // Round Robin entre asesores seleccionados
                try {
                  const metadataRef = doc(db, 'metadata', tenantId);
                  const metaDoc = await getDoc(metadataRef);
                  let nextIndex = 0;
                  const key = `lastAssignedIndex_${wf.id}`; // Índice específico para esta regla
                  
                  if (metaDoc.exists() && metaDoc.data()[key] !== undefined) {
                    const lastIndex = metaDoc.data()[key];
                    nextIndex = (lastIndex + 1) % targetAgents.length;
                  }

                  const selectedAgentId = targetAgents[nextIndex];

                  await updateDoc(doc(db, 'leads', payload.id), {
                    assignedTo: selectedAgentId,
                    updatedAt: serverTimestamp()
                  });
                  payload.assignedTo = selectedAgentId;

                  await setDoc(metadataRef, { [key]: nextIndex }, { merge: true });
                } catch (err) {
                  console.error('[Round Robin Group] Error:', err);
                }
              }
            } 
            else if (action.type === 'assign_round_robin') {
              // Action: Assign Round Robin
              try {
                // 1. Obtener a todos los asesores disponibles
                const agentsQ = query(collection(db, 'users'), where('tenantId', '==', tenantId), where('role', '==', 'agent'));
                const agentsSnap = await getDocs(agentsQ);
                const agents = agentsSnap.docs.map(d => d.id);
                
                if (agents.length > 0) {
                  // 2. Obtener el último índice asignado
                  const metadataRef = doc(db, 'metadata', tenantId);
                  const metaDoc = await getDoc(metadataRef);
                  
                  let nextIndex = 0;
                  if (metaDoc.exists() && metaDoc.data().lastAssignedIndex !== undefined) {
                    const lastIndex = metaDoc.data().lastAssignedIndex;
                    nextIndex = (lastIndex + 1) % agents.length;
                  }

                  const selectedAgentId = agents[nextIndex];

                  // 3. Asignar el lead
                  await updateDoc(doc(db, 'leads', payload.id), {
                    assignedTo: selectedAgentId,
                    updatedAt: serverTimestamp()
                  });
                  payload.assignedTo = selectedAgentId;

                  // 4. Actualizar el índice en metadata usando firestore simple (sin transacción en v1)
                  await setDoc(metadataRef, { lastAssignedIndex: nextIndex }, { merge: true });
                }
              } catch (err) {
                console.error('[Round Robin] Error:', err);
              }
            } 
            else if (action.type === 'add_tag') {
              // Action: Add a tag (assuming payload has a tags array)
              const currentTags = payload.tags || [];
              if (!currentTags.includes(action.payload)) {
                await updateDoc(doc(db, 'leads', payload.id), {
                  tags: [...currentTags, action.payload],
                  updatedAt: serverTimestamp()
                });
                payload.tags = [...currentTags, action.payload];
              }
            }
            else if (action.type === 'create_task') {
              // Action: Create automatic task
              await addDoc(collection(db, 'follow_ups'), {
                tenantId: tenantId,
                leadId: payload.id,
                leadName: `${payload.firstName} ${payload.lastName}`,
                type: 'Call',
                notes: action.payload, // The task description
                date: new Date(Date.now() + 86400000).toISOString(), // +24 hours
                status: 'pending',
                assignedTo: payload.assignedTo || 'unassigned', // Assign to the lead's owner
                createdAt: serverTimestamp()
              });
            }
            else if (action.type === 'notify') {
              // Action: Internal Notification (Create in 'notifications' collection)
              await addDoc(collection(db, 'notifications'), {
                tenantId: tenantId,
                userId: payload.assignedTo || 'all',
                title: 'Alerta de Automatización',
                message: action.payload,
                read: false,
                link: `/comercial?leadId=${payload.id}`,
                createdAt: serverTimestamp()
              });
            }
          }
        }
      }

    } catch (error) {
      console.error('[Workflow Engine] Error executing workflows:', error);
    }
  };

  return { executeWorkflows };
}
