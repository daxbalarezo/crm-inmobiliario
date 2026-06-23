import { writeBatch, doc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const FIRST_NAMES = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Jorge', 'Lucia', 'Miguel', 'Carmen', 'Pedro', 'Laura', 'Diego', 'Elena', 'Fernando', 'Paula'];
const LAST_NAMES = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Romero', 'Suarez', 'Diaz', 'Flores', 'Ruiz', 'Torres', 'Ramirez', 'Cruz'];

const SOURCES = ['Facebook', 'Instagram', 'Web', 'Referido', 'Google Ads', 'Presencial'];
const STAGES = ['PROSPECTO', 'SIN_CONTACTAR', 'EN_NEGOCIACION', 'VISITA', 'SEPARACION', 'VENDIDO', 'PERDIDO'];
const LOSS_REASONS = ['Precio muy alto', 'Falta de crédito', 'Eligió a la competencia', 'Ya no está interesado', 'No contesta'];
const INTEREST_LEVELS = ['Alto', 'Medio', 'Bajo'];
const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'whatsapp'];

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

export async function clearTestData(tenantId: string) {
  if (!tenantId) return;
  const leadsRef = collection(db, 'leads');
  const actRef = collection(db, 'lead_activities');
  
  const leadsSnap = await getDocs(query(leadsRef, where('tenantId', '==', tenantId)));
  const actSnap = await getDocs(query(actRef, where('tenantId', '==', tenantId)));
  
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  for (const doc of leadsSnap.docs) {
    batch.delete(doc.ref);
    opCount++;
    if (opCount >= 400) await commitBatch();
  }
  for (const doc of actSnap.docs) {
    batch.delete(doc.ref);
    opCount++;
    if (opCount >= 400) await commitBatch();
  }
  await commitBatch();
};

export const seedTestData = async (tenantId: string, users: any[]) => {
  if (!tenantId || users.length === 0) {
    throw new Error("Se necesita un tenantId y una lista de asesores");
  }

  const leadsRef = collection(db, 'leads');
  const activitiesRef = collection(db, 'lead_activities');

  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatchIfNeeded = async () => {
    if (opCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const numLeads = 400;
  
  for (let i = 0; i < numLeads; i++) {
    const leadDoc = doc(leadsRef);
    const assignedUser = randomItem(users);
    
    const createdAt = randomDate(sixMonthsAgo, now);
    const status = randomItem(STAGES);
    const isLost = status === 'PERDIDO';

    const leadData: any = {
      tenantId,
      assignedTo: assignedUser.uid,
      name: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      email: `test_${i}_${Date.now()}@example.com`,
      phone: `+51 9${randomInt(10000000, 99999999)}`,
      source: randomItem(SOURCES),
      status,
      interestLevel: randomItem(INTEREST_LEVELS),
      createdAt,
      updatedAt: createdAt,
    };

    if (isLost) {
      leadData.lossReason = randomItem(LOSS_REASONS);
    }

    if (['EN_NEGOCIACION', 'SEPARACION', 'VENDIDO'].includes(status)) {
      leadData.savedProforma = {
        finalPrice: randomInt(50000, 300000)
      };
    }

    if (status !== 'PROSPECTO') {
      const firstContact = new Date(createdAt.getTime() + randomInt(1000 * 60 * 10, 1000 * 60 * 60 * 48)); // 10 min to 48 hours later
      if (firstContact < now) {
        leadData.firstContactAt = firstContact;
      }
    }

    batch.set(leadDoc, leadData);
    opCount++;
    await commitBatchIfNeeded();

    const numActivities = randomInt(1, 5);
    for (let j = 0; j < numActivities; j++) {
      const actDoc = doc(activitiesRef);
      const actDate = randomDate(createdAt, now);
      const activityType = randomItem(ACTIVITY_TYPES);
      
      const actData = {
        tenantId,
        leadId: leadDoc.id,
        userId: assignedUser.uid,
        type: activityType,
        content: `Actividad autogenerada de tipo ${activityType}`,
        createdAt: actDate
      };
      
      batch.set(actDoc, actData);
      opCount++;
      await commitBatchIfNeeded();
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
};
