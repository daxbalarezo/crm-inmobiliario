import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Secret Token verification (Facebook requires you to verify a token when configuring the webhook)
const VERIFY_TOKEN = 'crm_inmobiliario_secreto_2026';

export const metaWebhook = functions.https.onRequest(async (req, res) => {
  // Configuración del Webhook por parte de Facebook (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
    return;
  }

  // Recepción de Leads desde Facebook (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object === 'page') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            // Verifica que el cambio sea un nuevo lead
            if (change.field === 'leadgen' && change.value) {
              const leadgenId = change.value.leadgen_id;
              // const formId = change.value.form_id;
              // const pageId = change.value.page_id;

              // Aquí normalmente se haría una llamada a la Graph API de FB para obtener 
              // los datos del lead usando el leadgenId. 
              // Por simplicidad, simularemos la creación con un payload genérico.
              
              // --- SIMULACIÓN DE DATOS DEL LEAD ---
              const newLead = {
                tenantId: 'your_default_tenant_id', // TODO: Mapear pageId con el tenantId de la empresa
                projectId: 'all',
                name: 'Lead de Facebook ' + Math.floor(Math.random() * 1000),
                phone: '+51 900 000 000',
                email: 'test@facebook.com',
                source: 'Facebook Ads',
                status: 'Nuevo',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                assignedTo: 'unassigned' // Será asignado por Round Robin
              };

              console.log('Nuevo Lead Detectado:', leadgenId);

              // 1. Guardar el Lead en Firestore
              const leadRef = await db.collection('leads').add(newLead);
              
              // 2. Ejecutar Round Robin (Asignación automática equitativa)
              await executeRoundRobin(newLead.tenantId, leadRef.id);
            }
          }
        }
        res.status(200).send('EVENT_RECEIVED');
      } else {
        res.sendStatus(404);
      }
    } catch (error) {
      console.error('Error procesando webhook de FB:', error);
      res.sendStatus(500);
    }
  }
});

// Lógica Round Robin en el servidor
async function executeRoundRobin(tenantId: string, leadId: string) {
  try {
    const usersSnap = await db.collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'agent')
      .get();
      
    if (usersSnap.empty) {
      console.log('No hay agentes para asignar.');
      return;
    }

    const agents = usersSnap.docs.map(d => d.id);
    
    // Obtener el índice en una transacción para evitar condiciones de carrera (Race conditions)
    const metadataRef = db.collection('metadata').doc(tenantId);
    
    await db.runTransaction(async (transaction) => {
      const metaDoc = await transaction.get(metadataRef);
      
      let nextIndex = 0;
      if (metaDoc.exists && metaDoc.data()?.lastAssignedIndex !== undefined) {
        const lastIndex = metaDoc.data()!.lastAssignedIndex;
        nextIndex = (lastIndex + 1) % agents.length;
      }

      const selectedAgentId = agents[nextIndex];

      // Actualizar el Lead
      transaction.update(db.collection('leads').doc(leadId), {
        assignedTo: selectedAgentId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Actualizar el índice
      transaction.set(metadataRef, { lastAssignedIndex: nextIndex }, { merge: true });
      
      console.log(`Lead ${leadId} asignado al agente ${selectedAgentId} (Índice ${nextIndex})`);
    });
  } catch (err) {
    console.error('Error en Round Robin:', err);
  }
}
