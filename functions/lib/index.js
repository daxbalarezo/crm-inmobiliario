"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaWebhook = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// Secret Token verification (Facebook requires you to verify a token when configuring the webhook)
const VERIFY_TOKEN = 'crm_inmobiliario_secreto_2026';
exports.metaWebhook = functions.https.onRequest(async (req, res) => {
    // Configuración del Webhook por parte de Facebook (GET)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else {
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
            }
            else {
                res.sendStatus(404);
            }
        }
        catch (error) {
            console.error('Error procesando webhook de FB:', error);
            res.sendStatus(500);
        }
    }
});
// Lógica Round Robin en el servidor
async function executeRoundRobin(tenantId, leadId) {
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
            var _a;
            const metaDoc = await transaction.get(metadataRef);
            let nextIndex = 0;
            if (metaDoc.exists && ((_a = metaDoc.data()) === null || _a === void 0 ? void 0 : _a.lastAssignedIndex) !== undefined) {
                const lastIndex = metaDoc.data().lastAssignedIndex;
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
    }
    catch (err) {
        console.error('Error en Round Robin:', err);
    }
}
//# sourceMappingURL=index.js.map